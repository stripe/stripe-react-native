package com.reactnativestripesdk.bridgecontracts

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.reactnativestripesdk.EmbeddedPaymentElementViewManager
import com.reactnativestripesdk.FakePromise
import com.reactnativestripesdk.OnrampSdkModule
import com.reactnativestripesdk.PaymentMethodCreateParamsException
import com.reactnativestripesdk.PaymentMethodCreateParamsFactory
import com.reactnativestripesdk.PaymentSheetManager
import com.reactnativestripesdk.StripeSdkModule
import com.reactnativestripesdk.buildIntentConfiguration
import com.reactnativestripesdk.buildPaymentSheetConfiguration
import com.reactnativestripesdk.mapToRowSelectionBehaviorType
import com.reactnativestripesdk.utils.mapToPaymentMethodType
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.model.ConfirmStripeIntentParams
import org.json.JSONObject
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

/**
 * One runner per bridge method. Each calls the production mapper with the
 * fixture input and returns the objects the assertion keys resolve against.
 */
internal object BridgeRunners {
  val forMethod: Map<String, (BridgeFixture) -> BridgeObservation> by lazy {
    coreAndConfirmRunners +
      paymentSheetAndEmbeddedRunners +
      CustomerSheetAndPlatformPayRunners.runners +
      CheckoutAndVerticalRunners.runners +
      ComponentRunners.runners
  }

  const val PUBLISHABLE_KEY = "pk_test_bridge_contracts"

  fun initialiseParams() =
    JavaOnlyMap.of("publishableKey", PUBLISHABLE_KEY, "appInfo", JavaOnlyMap.of("name", "bridge-contracts"))

  /** What the promise settled with: the resolved value, the rejection, or "<unresolved>". */
  fun settledValue(promise: FakePromise): Any? {
    promise.resolveCalls.asChannel().tryReceive().getOrNull()?.let { return it.value }
    promise.rejectCalls.asChannel().tryReceive().getOrNull()?.let { rejection ->
      return mapOf("rejected" to mapOf("code" to rejection.code, "message" to rejection.message))
    }
    return "<unresolved>"
  }

  private val coreAndConfirmRunners: Map<String, (BridgeFixture) -> BridgeObservation> =
    mapOf(
      "StripeSdk.initialise" to ::initialise,
      "OnrampSdk.initialise" to ::onrampInitialise,
      "StripeSdk.createPaymentMethod" to ::createPaymentMethod,
      "StripeSdk.confirmPayment" to ::confirmPayment,
      "StripeSdk.confirmSetupIntent" to ::confirmSetupIntent,
      "StripeSdk.createToken" to { fixture ->
        moduleResult { module, promise -> module.createToken(requireNotNull(fixture.map("params")), promise) }
      },
      "StripeSdk.verifyMicrodeposits" to { fixture ->
        moduleResult { module, promise ->
          module.verifyMicrodeposits(
            fixture.boolean("isPaymentIntent"),
            requireNotNull(fixture.string("clientSecret")),
            requireNotNull(fixture.map("params")),
            promise,
          )
        }
      },
      "StripeSdk.collectBankAccount" to { fixture ->
        moduleResult { module, promise ->
          module.collectBankAccount(
            fixture.boolean("isPaymentIntent"),
            requireNotNull(fixture.string("clientSecret")),
            requireNotNull(fixture.map("params")),
            promise,
          )
        }
      },
    )

  private val paymentSheetAndEmbeddedRunners: Map<String, (BridgeFixture) -> BridgeObservation> =
    mapOf(
      "StripeSdk.initPaymentSheet" to ::initPaymentSheet,
      "StripeSdk.presentPaymentSheet" to { fixture ->
        moduleResult { module, promise ->
          module.presentPaymentSheet(requireNotNull(fixture.map("options")), promise)
        }
      },
      "StripeSdk.intentCreationCallback" to { fixture ->
        moduleResult { module, promise ->
          module.intentCreationCallback(requireNotNull(fixture.map("result")), promise)
        }
      },
      "StripeSdk.confirmationTokenCreationCallback" to { fixture ->
        moduleResult { module, promise ->
          module.confirmationTokenCreationCallback(requireNotNull(fixture.map("result")), promise)
        }
      },
      "StripeSdk.customPaymentMethodResultCallback" to { fixture ->
        moduleResult { module, promise -> module.customPaymentMethodResultCallback(fixture.map("result"), promise) }
      },
      "StripeSdk.createEmbeddedPaymentElement" to ::createEmbeddedPaymentElement,
      "StripeSdk.updateEmbeddedPaymentElement" to ::updateEmbeddedPaymentElement,
    )

  private val intentConfigurationAliases =
    mapOf("intentConfiguration.mode.setupFutureUsage" to "intentConfiguration.mode.setupFutureUse")

  internal fun FakePromise.resolvedValue(): Any? = resolveCalls.takeItem().value

  private fun initPaymentSheet(fixture: BridgeFixture): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val host = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val promise = FakePromise()
    PaymentConfiguration.init(context, "pk_test_bridge_contracts")
    context.onHostResume(host.get())
    val manager = PaymentSheetManager(context, params, promise)
    try {
      manager.create()
      shadowOf(Looper.getMainLooper()).idle()
      return BridgeObservation(
        roots =
          mapOf(
            "result" to promise.resolvedValue(),
            "sheet" to manager,
            "configuration" to runCatching { buildPaymentSheetConfiguration(params, context) }.getOrNull(),
            "intentConfiguration" to
              runCatching { buildIntentConfiguration(params.getMap("intentConfiguration")) }.getOrNull(),
          ),
        aliases =
          intentConfigurationAliases +
            ("configuration.shippingDetails.phone" to "configuration.shippingDetails.phoneNumber"),
      )
    } finally {
      manager.destroy()
      shadowOf(Looper.getMainLooper()).idle()
      context.onHostPause()
      context.onHostDestroy()
      host.pause().stop().destroy()
    }
  }

  /** The view manager's prop setters call these parsers without catching, so a throw reaches React. */
  private fun createEmbeddedPaymentElement(fixture: BridgeFixture): BridgeObservation {
    val manager = EmbeddedPaymentElementViewManager()
    val configuration = requireNotNull(fixture.map("configuration"))
    val element = runCatching { manager.parseElementConfiguration(configuration, RuntimeEnvironment.getApplication()) }
    val intent = runCatching { manager.parseIntentConfiguration(requireNotNull(fixture.map("intentConfig"))) }
    val thrown = (intent.exceptionOrNull() ?: element.exceptionOrNull())?.let { error ->
      error.javaClass.simpleName + (error.message?.let { ": $it" } ?: "")
    }
    return BridgeObservation(
      roots =
        mapOf(
          "configuration" to element.getOrNull(),
          "rowSelectionBehavior" to mapToRowSelectionBehaviorType(configuration),
          "intentConfiguration" to intent.getOrNull(),
          "thrown" to thrown,
        ),
      aliases = intentConfigurationAliases + ("configuration.rowSelectionBehavior" to "rowSelectionBehavior"),
    )
  }

  private fun updateEmbeddedPaymentElement(fixture: BridgeFixture): BridgeObservation {
    val manager = EmbeddedPaymentElementViewManager()
    val intentConfiguration = manager.jsonToWritableMap(JSONObject(fixture.jsonString("intentConfig")))
    val update =
      moduleResult { module, promise ->
        module.updateEmbeddedPaymentElement(requireNotNull(fixture.map("intentConfig")), promise)
      }
    return BridgeObservation(
      roots = update.roots + ("intentConfiguration" to buildIntentConfiguration(intentConfiguration)),
      aliases = intentConfigurationAliases,
    )
  }

  /** Calls a StripeSdkModule method that settles before any network call. */
  fun moduleResult(call: (StripeSdkModule, FakePromise) -> Unit): BridgeObservation {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = StripeSdkModule(context)
    val promise = FakePromise()
    try {
      call(module, promise)
      shadowOf(Looper.getMainLooper()).idle()
      return BridgeObservation(roots = mapOf("result" to settledValue(promise)))
    } finally {
      module.invalidate()
    }
  }

  private fun createPaymentMethod(fixture: BridgeFixture): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val options = requireNotNull(fixture.map("options"))
    val factory = PaymentMethodCreateParamsFactory(params.getMap("paymentMethodData"), options, null, null)
    val type = requireNotNull(mapToPaymentMethodType(params.getString("paymentMethodType")))
    return try {
      BridgeObservation(roots = mapOf("api" to factory.createPaymentMethodParams(type).toParamMap()))
    } catch (_: PaymentMethodCreateParamsException) {
      moduleResult { module, promise -> module.createPaymentMethod(params, options, promise) }
    }
  }

  private fun confirmPayment(fixture: BridgeFixture): BridgeObservation =
    confirmedParams("confirmPaymentParams") { module, promise ->
      module.confirmPayment(
        requireNotNull(fixture.string("paymentIntentClientSecret")),
        fixture.map("params"),
        fixture.map("options"),
        promise,
      )
    }

  private fun confirmSetupIntent(fixture: BridgeFixture): BridgeObservation =
    confirmedParams("confirmSetupParams") { module, promise ->
      module.confirmSetupIntent(
        requireNotNull(fixture.string("paymentIntentClientSecret")),
        requireNotNull(fixture.map("params")),
        requireNotNull(fixture.map("options")),
        promise,
      )
    }

  /**
   * Confirms through a module initialised with a urlScheme Android may use for return URLs. The
   * api root is the confirm params the module hands its PaymentLauncherManager, which settles the
   * promise with the missing-activity error before PaymentLauncher would send them.
   */
  private fun confirmedParams(
    field: String,
    call: (StripeSdkModule, FakePromise) -> Unit,
  ): BridgeObservation {
    val module = StripeSdkModule(BridgeReactContext(RuntimeEnvironment.getApplication()))
    val promise = FakePromise()
    try {
      module.initialise(
        JavaOnlyMap.of(
          "publishableKey",
          PUBLISHABLE_KEY,
          "appInfo",
          JavaOnlyMap.of("name", "bridge-contracts"),
          "urlScheme",
          "bridgecontracts",
          "setReturnUrlSchemeOnAndroid",
          true,
        ),
        FakePromise(),
      )
      call(module, promise)
      shadowOf(Looper.getMainLooper()).idle()
      val launcher = BridgeAssert.child(module, "paymentLauncherManager")
      val params = BridgeAssert.child(launcher, field) as? ConfirmStripeIntentParams
      return BridgeObservation(roots = mapOf("api" to params?.toParamMap(), "result" to settledValue(promise)))
    } finally {
      module.invalidate()
      Stripe.appInfo = null
    }
  }

  private val threeDSAliases =
    mapOf(
      "threeDS.label" to "threeDS.uiCustomization.uiCustomization.labelCustomization",
      "threeDS.label.headingFontSize" to
        "threeDS.uiCustomization.uiCustomization.labelCustomization.headingTextFontSize",
      "threeDS.navigationBar" to "threeDS.uiCustomization.uiCustomization.toolbarCustomization",
      "threeDS.textField" to "threeDS.uiCustomization.uiCustomization.textBoxCustomization",
      "threeDS.textField.borderRadius" to "threeDS.uiCustomization.uiCustomization.textBoxCustomization.cornerRadius",
      "threeDS.accentColor" to "threeDS.uiCustomization.uiCustomization.accentColor",
    )

  private fun initialise(fixture: BridgeFixture): BridgeObservation {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = StripeSdkModule(context)
    val promise = FakePromise()
    try {
      module.initialise(requireNotNull(fixture.map("params")), promise)
      val paymentConfiguration = PaymentConfiguration.getInstance(context)
      return BridgeObservation(
        roots =
          mapOf(
            "result" to promise.resolvedValue(),
            "apiClient" to
              mapOf(
                "publishableKey" to paymentConfiguration.publishableKey,
                "stripeAccount" to paymentConfiguration.stripeAccountId,
                "appInfo" to Stripe.appInfo,
              ),
            "sdk" to module,
            "threeDS" to BridgeAssert.child(PaymentAuthConfig.get(), "stripe3ds2Config"),
          ),
        aliases = threeDSAliases,
      )
    } finally {
      module.invalidate()
      Stripe.appInfo = null
      PaymentAuthConfig.init(
        PaymentAuthConfig
          .Builder()
          .set3ds2Config(PaymentAuthConfig.Stripe3ds2Config.Builder().build())
          .build(),
      )
    }
  }

  private fun onrampInitialise(fixture: BridgeFixture): BridgeObservation {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = OnrampSdkModule(context)
    val promise = FakePromise()
    try {
      module.initialise(requireNotNull(fixture.map("params")), promise)
      return BridgeObservation(roots = mapOf("result" to promise.resolvedValue(), "onramp" to module))
    } finally {
      module.invalidate()
    }
  }
}
