@file:OptIn(CheckoutSessionPreview::class, ExperimentalCryptoOnramp::class, LinkControllerPreview::class)

package com.reactnativestripesdk.bridgecontracts

import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.reactnativestripesdk.FakePromise
import com.reactnativestripesdk.LinkControllerManager
import com.reactnativestripesdk.OnrampSdkModule
import com.reactnativestripesdk.StripeSdkModule
import com.reactnativestripesdk.checkout.CheckoutConfigurationMapper
import com.reactnativestripesdk.checkout.NativeCheckoutControllerInstance
import com.reactnativestripesdk.checkout.checkoutSession
import com.reactnativestripesdk.mapConfig
import com.reactnativestripesdk.mapToComplianceIdentifiers
import com.reactnativestripesdk.mapToKycInfo
import com.reactnativestripesdk.utils.mapToPaymentSheetAddress
import com.reactnativestripesdk.utils.mapToPreCollectedConsent
import com.stripe.android.checkout.CheckoutElementsController
import com.stripe.android.checkout.CheckoutElementsPresenter
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.OnrampCoordinator
import com.stripe.android.crypto.onramp.model.OnrampRegisterLinkUserResult
import com.stripe.android.link.LinkController
import com.stripe.android.link.LinkControllerPreview
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import org.mockito.Mockito.RETURNS_DEFAULTS
import org.mockito.Mockito.RETURNS_SELF
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockConstruction
import org.mockito.Mockito.mockingDetails
import org.mockito.Mockito.`when`
import org.mockito.Mockito.withSettings
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

internal object CheckoutAndVerticalRunners {
  val runners: Map<String, (BridgeFixture) -> BridgeObservation> =
    mapOf(
      "StripeSdk.createCheckout" to ::createCheckout,
      "StripeSdk.updateCheckoutShippingAddress" to { fixture ->
        val params = requireNotNull(fixture.map("params"))
        BridgeRunners
          .moduleResult { module, promise ->
            module.updateCheckoutShippingAddress(requireNotNull(fixture.string("controllerId")), params, promise)
          }.with("address" to CheckoutConfigurationMapper.mapAddress(requireNotNull(params.getMap("address"))))
      },
      "StripeSdk.confirmCheckout" to { fixture ->
        val controllerId = requireNotNull(fixture.string("controllerId"))
        BridgeRunners
          .moduleResult { module, promise -> module.confirmCheckout(controllerId, promise) }
          .with("completed" to completedCheckout(controllerId))
      },
      "StripeSdk.collectBankAccountToken" to { fixture ->
        financialConnections(fixture) { module, promise ->
          module.collectBankAccountToken(
            requireNotNull(fixture.string("clientSecret")),
            requireNotNull(fixture.map("params")),
            promise,
          )
        }
      },
      "StripeSdk.collectFinancialConnectionsAccounts" to { fixture ->
        financialConnections(fixture) { module, promise ->
          module.collectFinancialConnectionsAccounts(
            requireNotNull(fixture.string("clientSecret")),
            requireNotNull(fixture.map("params")),
            promise,
          )
        }
      },
      "StripeSdk.canAddCardToWallet" to { fixture ->
        BridgeRunners.moduleResult { module, promise ->
          module.canAddCardToWallet(requireNotNull(fixture.map("params")), promise)
        }
      },
      "StripeSdk.isCardInWallet" to { fixture ->
        BridgeRunners.moduleResult { module, promise ->
          module.isCardInWallet(requireNotNull(fixture.map("params")), promise)
        }
      },
      "OnrampSdk.configureOnramp" to { fixture ->
        val config = requireNotNull(fixture.map("config"))
        onrampResult { module, promise -> module.configureOnramp(config, promise) }
          .with("configuration" to mapConfig(config, BridgeRunners.PUBLISHABLE_KEY))
      },
      "OnrampSdk.registerLinkUser" to { fixture ->
        val info = requireNotNull(fixture.map("info"))
        onrampResult { module, promise -> module.registerLinkUser(info, promise) }
          .with("info" to registeredLinkUser(info))
      },
      "OnrampSdk.attachKycInfo" to { fixture ->
        val kycInfo = requireNotNull(fixture.map("kycInfo"))
        onrampResult { module, promise -> module.attachKycInfo(kycInfo, promise) }
          .with("kycInfo" to mapToKycInfo(kycInfo))
      },
      "OnrampSdk.submitIdentifiers" to { fixture ->
        val identifiers = requireNotNull(fixture.array("identifiers"))
        BridgeObservation(
          roots =
            onrampResult { module, promise -> module.submitIdentifiers(identifiers, promise) }.roots +
              ("identifiers" to mapToComplianceIdentifiers(identifiers)),
          aliases = mapOf("identifiers.0.type" to "identifiers.0.type.value"),
        )
      },
      "OnrampSdk.presentKycInfoVerification" to { fixture ->
        val address = fixture.map("updatedAddress")
        onrampResult { module, promise -> module.presentKycInfoVerification(address, promise) }
          .with("address" to mapToPaymentSheetAddress(address))
      },
      "OnrampSdk.collectPaymentMethod" to { fixture ->
        val paymentMethod = requireNotNull(fixture.string("paymentMethod"))
        val platformPayParams = requireNotNull(fixture.map("platformPayParams"))
        onrampResult { module, promise -> module.collectPaymentMethod(paymentMethod, platformPayParams, promise) }
          .with("selection" to collectedSelection(paymentMethod, platformPayParams))
      },
      "OnrampSdk.getCryptoTokenDisplayData" to { fixture ->
        val token = requireNotNull(fixture.map("token"))
        onrampResult { module, promise -> module.getCryptoTokenDisplayData(token, promise) }
      },
      "StripeSdk.initLinkController" to ::initLinkController,
      "StripeSdk.presentLinkController" to {
        val linked = linkedModuleResult { module, promise -> module.presentLinkController(promise) }
        BridgeRunners
          .moduleResult { module, promise -> module.presentLinkController(promise) }
          .with("completed" to linked.result)
      },
      "StripeSdk.confirmLinkControllerSetupIntent" to { fixture ->
        val params = requireNotNull(fixture.map("params"))
        val linked = linkedModuleResult { module, promise -> module.confirmLinkControllerSetupIntent(params, promise) }
        BridgeRunners
          .moduleResult { module, promise -> module.confirmLinkControllerSetupIntent(params, promise) }
          .with("controller" to mapOf("clientSecret" to linked.confirmedClientSecret), "completed" to linked.result)
      },
    )

  private class Linked(
    val result: Any?,
    val confirmedClientSecret: Any?,
  )

  /**
   * Calls the module after initLinkController's production path configured its manager. A
   * configured controller needs the network, so the manager builds a LinkController double whose
   * presenter completes every flow with a card; the result is what the module resolves with.
   */
  private fun linkedModuleResult(call: (StripeSdkModule, FakePromise) -> Unit): Linked {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val host = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    context.onHostResume(host.get())
    val paymentMethod = requireNotNull(PaymentMethod.fromJson(JSONObject(LINK_PAYMENT_METHOD)))
    var presentCallback: LinkController.PresentCallback? = null
    var confirmCallback: LinkController.ConfirmSetupIntentCallback? = null
    var confirmedClientSecret: Any? = null
    val presented =
      LinkController.PresentResult.Completed::class.java
        .getDeclaredConstructor(PaymentMethod::class.java)
        .newInstance(paymentMethod)
    val confirmed =
      LinkController.ConfirmSetupIntentResult.Success::class.java
        .getDeclaredConstructor(PaymentMethod::class.java)
        .newInstance(paymentMethod)
    val presenter =
      mock(LinkController.Presenter::class.java) { invocation ->
        when (invocation.method.name) {
          "present" -> presentCallback?.onPresentResult(presented)
          "confirmSetupIntent" -> {
            confirmedClientSecret = invocation.arguments.single()
            confirmCallback?.onConfirmSetupIntentResult(confirmed)
          }
        }
        null
      }
    val controller =
      mock(LinkController::class.java) { invocation ->
        when {
          invocation.method.name.startsWith("configure") -> Result.success(Unit)
          invocation.method.name == "createPresenter" -> {
            presentCallback = invocation.arguments[4] as LinkController.PresentCallback
            confirmCallback = invocation.arguments[5] as LinkController.ConfirmSetupIntentCallback
            presenter
          }
          invocation.method.name == "getPaymentMethodPreview" -> MutableStateFlow(null)
          else -> RETURNS_DEFAULTS.answer(invocation)
        }
      }
    val manager = LinkControllerManager(context, BridgeRunners.PUBLISHABLE_KEY, null)
    setPrivateField(manager, "linkController", controller)
    manager.configure(JavaOnlyMap.of("merchantDisplayName", "Bridge Contracts, Inc."), FakePromise())
    shadowOf(Looper.getMainLooper()).idle()
    val module = StripeSdkModule(context)
    setPrivateField(module, "linkControllerManager", manager)
    val promise = FakePromise()
    try {
      call(module, promise)
      shadowOf(Looper.getMainLooper()).idle()
      return Linked(BridgeRunners.settledValue(promise), confirmedClientSecret)
    } finally {
      module.invalidate()
      context.onHostPause()
      context.onHostDestroy()
      host.pause().stop().destroy()
    }
  }

  private const val LINK_PAYMENT_METHOD =
    """{"id":"pm_bridge_contracts","object":"payment_method","type":"card","livemode":false,""" +
      """"created":1700000000,"card":{"brand":"visa","last4":"4242","exp_month":12,"exp_year":2030}}"""

  private fun setPrivateField(
    owner: Any,
    name: String,
    value: Any?,
  ) {
    owner.javaClass.getDeclaredField(name).apply { isAccessible = true }.set(owner, value)
  }

  /**
   * Confirms through the module with a controller registered under [controllerId]. Native
   * confirmation presents the Payment Element and calls the network, so the controller's presenter
   * reports what the SDK reports for a paid session.
   */
  private fun completedCheckout(controllerId: String): Any? {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val host = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    context.onHostResume(host.get())
    val paid =
      CheckoutElementsController.Session.Status.Complete::class.java
        .getDeclaredConstructor(CheckoutElementsController.Session.Status.PaymentStatus::class.java)
        .newInstance(CheckoutElementsController.Session.Status.PaymentStatus.Paid)
    val completed =
      CheckoutElementsController.Result.Completed::class.java
        .getDeclaredConstructor()
        .newInstance()
    lateinit var instance: NativeCheckoutControllerInstance
    val presenter =
      mock(CheckoutElementsPresenter::class.java) { invocation ->
        if (invocation.method.name == "confirm") instance.onConfirmationResult(completed)
        null
      }
    val controller =
      mock(CheckoutElementsController::class.java) { invocation ->
        when (invocation.method.name) {
          "getSession" -> MutableStateFlow(checkoutSession(status = paid))
          "isUpdating" -> MutableStateFlow(false)
          "createPresenter" -> presenter
          else -> RETURNS_DEFAULTS.answer(invocation)
        }
      }
    instance =
      NativeCheckoutControllerInstance(
        controller,
        mock(EventEmitterCompat::class.java),
        CoroutineScope(SupervisorJob() + Dispatchers.Unconfined),
        JavaOnlyMap(),
        context,
      )
    val module = StripeSdkModule(context)
    module.checkoutControllers[controllerId] = instance
    val promise = FakePromise()
    try {
      module.confirmCheckout(controllerId, promise)
      shadowOf(Looper.getMainLooper()).idle()
      return BridgeRunners.settledValue(promise)
    } finally {
      module.checkoutControllers.remove(controllerId)?.destroy()
      module.invalidate()
      context.onHostPause()
      context.onHostDestroy()
      host.pause().stop().destroy()
    }
  }

  private fun BridgeObservation.with(vararg roots: Pair<String, Any?>) = BridgeObservation(this.roots + roots, aliases)

  /**
   * Creates the controller through createCheckout. Configuring it loads the session over the
   * network, so the builder hands the module a controller that records what it is configured
   * with and returns the checkout session double.
   */
  private fun createCheckout(fixture: BridgeFixture): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val controllerId = requireNotNull(fixture.string("controllerId"))
    val controller =
      mock(CheckoutElementsController::class.java) { invocation ->
        when {
          invocation.method.name.startsWith("configure") ->
            CheckoutElementsController.OperationResult.Succeeded::class.java
              .getDeclaredConstructor()
              .apply { isAccessible = true }
              .newInstance()
          invocation.method.name == "getSession" -> MutableStateFlow(checkoutSession())
          invocation.method.name == "isUpdating" -> MutableStateFlow(false)
          else -> RETURNS_DEFAULTS.answer(invocation)
        }
      }
    val observation =
      mockConstruction(
        CheckoutElementsController.Builder::class.java,
        withSettings().defaultAnswer(RETURNS_SELF),
      ) { builder, _ ->
        `when`(builder.build()).thenReturn(controller)
      }.use {
        BridgeRunners.moduleResult { module, promise -> module.createCheckout(params, controllerId, promise) }
      }
    val configure =
      mockingDetails(controller).invocations.singleOrNull { it.method.name.startsWith("configure") }
        ?: return observation
    return BridgeObservation(
      roots =
        observation.roots +
          mapOf("clientSecret" to configure.arguments[0], "configuration" to configure.arguments[1]),
      aliases = mapOf("configuration.shippingAddressElement" to "configuration.shippingAddressElementConfiguration"),
    )
  }

  /** A configured coordinator needs the network, so a module holding a recording one shows what the module hands it. */
  private fun registeredLinkUser(info: ReadableMap): Any? {
    val registered = CompletableDeferred<Any?>()
    val coordinator =
      mock(OnrampCoordinator::class.java) { invocation ->
        if (invocation.method.name == "registerLinkUser") {
          registered.complete(invocation.arguments.first())
          OnrampRegisterLinkUserResult.Completed::class.java
            .getDeclaredConstructor(String::class.java)
            .apply { isAccessible = true }
            .newInstance("cus_bridge_contracts")
        } else {
          RETURNS_DEFAULTS.answer(invocation)
        }
      }
    val module = OnrampSdkModule(BridgeReactContext(RuntimeEnvironment.getApplication()))
    setPrivateField(module, "onrampCoordinator", coordinator)
    try {
      module.registerLinkUser(info, FakePromise())
      // The module calls the coordinator from Dispatchers.IO.
      return runBlocking { withTimeout(ONRAMP_TIMEOUT_MILLIS) { registered.await() } }
    } finally {
      module.invalidate()
    }
  }

  /**
   * A presenter needs a configured coordinator, so a module holding a recording one shows the
   * selection the module hands it.
   */
  private fun collectedSelection(
    paymentMethod: String,
    platformPayParams: ReadableMap,
  ): Map<String, Any?>? {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    context.onHostResume(activity)
    val presenter = mock(OnrampCoordinator.Presenter::class.java)
    val module = OnrampSdkModule(context)
    setPrivateField(module, "onrampCoordinator", mock(OnrampCoordinator::class.java))
    setPrivateField(module, "isOnrampConfigured", true)
    setPrivateField(module, "onrampPresenter", presenter)
    setPrivateField(module, "presenterActivity", activity)
    try {
      module.collectPaymentMethod(paymentMethod, platformPayParams, FakePromise())
      shadowOf(Looper.getMainLooper()).idle()
    } finally {
      module.invalidate()
    }
    val selection =
      mockingDetails(presenter)
        .invocations
        .singleOrNull { it.method.name == "collectPaymentMethod" }
        ?.arguments
        ?.first()
        ?: return null
    val kind = selection.javaClass.simpleName.replaceFirstChar { it.lowercase() }
    return mapOf("kind" to kind, kind to selection)
  }

  private const val ONRAMP_TIMEOUT_MILLIS = 5_000L

  private fun financialConnections(
    fixture: BridgeFixture,
    call: (com.reactnativestripesdk.StripeSdkModule, FakePromise) -> Unit,
  ): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val consent = mapToPreCollectedConsent(params)
    if (consent.isSuccess) {
      return BridgeObservation(roots = mapOf("preCollectedConsent" to consent.getOrNull()))
    }
    return BridgeRunners.moduleResult { module, promise ->
      module.initialise(
        BridgeRunners.initialiseParams(),
        FakePromise(),
      )
      call(module, promise)
    }
  }

  /** OnrampSdkModule resolves some calls from background dispatchers, so this polls for a bounded time. */
  private fun onrampResult(call: (OnrampSdkModule, FakePromise) -> Unit): BridgeObservation {
    val module = OnrampSdkModule(BridgeReactContext(RuntimeEnvironment.getApplication()))
    val promise = FakePromise()
    try {
      call(module, promise)
      var result: Any? = "<unresolved>"
      repeat(ONRAMP_POLLS) {
        shadowOf(Looper.getMainLooper()).idle()
        result = BridgeRunners.settledValue(promise)
        if (result != "<unresolved>") return BridgeObservation(roots = mapOf("result" to result))
        Thread.sleep(ONRAMP_POLL_MILLIS)
      }
      return BridgeObservation(roots = mapOf("result" to result))
    } finally {
      module.invalidate()
    }
  }

  private const val ONRAMP_POLLS = 100
  private const val ONRAMP_POLL_MILLIS = 50L

  /**
   * Configures through the manager. Configuring loads an elements session over the network, so
   * the manager holds a controller that records the configuration it gets and succeeds.
   */
  private fun initLinkController(fixture: BridgeFixture): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    context.onHostResume(Robolectric.buildActivity(ComponentActivity::class.java).setup().get())
    val controller =
      mock(LinkController::class.java) { invocation ->
        if (invocation.method.name.startsWith("configure")) {
          Result.success(Unit)
        } else {
          RETURNS_DEFAULTS.answer(invocation)
        }
      }
    val manager = LinkControllerManager(context, BridgeRunners.PUBLISHABLE_KEY, null)
    setPrivateField(manager, "linkController", controller)
    val promise = FakePromise()
    manager.configure(params, promise)
    shadowOf(Looper.getMainLooper()).idle()
    val configuration =
      mockingDetails(controller).invocations.singleOrNull { it.method.name.startsWith("configure") }?.arguments?.first()
    return BridgeObservation(
      roots = mapOf("configuration" to configuration, "result" to BridgeRunners.settledValue(promise)),
      aliases = mapOf("appearance" to "configuration.appearance"),
    )
  }
}
