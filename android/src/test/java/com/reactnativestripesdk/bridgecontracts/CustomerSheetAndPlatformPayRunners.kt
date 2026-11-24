package com.reactnativestripesdk.bridgecontracts

import android.os.Looper
import android.os.SystemClock
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.FakePromise
import com.reactnativestripesdk.GooglePayLauncherManager
import com.reactnativestripesdk.GooglePayRequestHelper
import com.reactnativestripesdk.ReactNativeCustomerAdapter
import com.reactnativestripesdk.StripeSdkModule
import com.reactnativestripesdk.customersheet.CustomerSheetManager
import com.reactnativestripesdk.customersheet.buildCustomerSheetConfiguration
import com.stripe.android.GooglePayJsonFactory
import com.stripe.android.PaymentConfiguration
import com.stripe.android.customersheet.CustomerSheet
import com.stripe.android.model.PaymentMethod
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.json.JSONArray
import org.json.JSONObject
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

/** ReactNativeCustomerAdapter looks StripeSdkModule up from its context, which needs a CatalystInstance. */
internal class ModuleReactContext : BridgeReactContext(RuntimeEnvironment.getApplication()) {
  var module: NativeModule? = null

  @Suppress("UNCHECKED_CAST")
  override fun <T : NativeModule> getNativeModule(nativeModuleInterface: Class<T>): T? = module as T?
}

internal object CustomerSheetAndPlatformPayRunners {
  val runners: Map<String, (BridgeFixture) -> BridgeObservation> =
    mapOf(
      "StripeSdk.initCustomerSheet" to ::initCustomerSheet,
      "StripeSdk.presentCustomerSheet" to { fixture ->
        val params = requireNotNull(fixture.map("params"))
        val looper = shadowOf(Looper.getMainLooper())
        var scheduledWithoutSheet = 0
        val observation =
          BridgeRunners.moduleResult { module, promise ->
            idle()
            val pendingBefore = looper.nextScheduledTaskTime
            module.presentCustomerSheet(params, promise)
            idle()
            if (looper.nextScheduledTaskTime != pendingBefore) scheduledWithoutSheet = 1
          }
        BridgeObservation(
          observation.roots +
            ("timeout" to presentedSheetTimeout(params) + ("withoutSheet" to scheduledWithoutSheet)),
          observation.aliases,
        )
      },
      "StripeSdk.customerAdapterFetchPaymentMethodsCallback" to ::fetchPaymentMethodsCallback,
      "StripeSdk.customerAdapterAttachPaymentMethodCallback" to { fixture ->
        adapterCallback { module, adapter, promise ->
          val deferred = CompletableDeferred<PaymentMethod>()
          adapter.attachPaymentMethodCallback = deferred
          module.customerAdapterAttachPaymentMethodCallback(requireNotNull(fixture.map("paymentMethod")), promise)
          deferred
        }
      },
      "StripeSdk.customerAdapterDetachPaymentMethodCallback" to { fixture ->
        adapterCallback { module, adapter, promise ->
          val deferred = CompletableDeferred<PaymentMethod>()
          adapter.detachPaymentMethodCallback = deferred
          module.customerAdapterDetachPaymentMethodCallback(requireNotNull(fixture.map("paymentMethod")), promise)
          deferred
        }
      },
      "StripeSdk.clientSecretProviderCustomerSessionClientSecretCallback" to { fixture ->
        BridgeRunners.moduleResult { module, promise ->
          module.clientSecretProviderCustomerSessionClientSecretCallback(
            requireNotNull(fixture.map("customerSessionClientSecret")),
            promise,
          )
        }
      },
      "StripeSdk.isPlatformPaySupported" to { fixture ->
        withModule { module, _ ->
          module.isPlatformPaySupported(fixture.map("params"), FakePromise())
          idle()
          BridgeObservation(
            roots = mapOf("googlePayLauncher" to BridgeAssert.child(module, "googlePayPaymentMethodLauncherManager")),
          )
        }
      },
      "StripeSdk.createPlatformPayPaymentMethod" to { fixture ->
        val context = BridgeReactContext(RuntimeEnvironment.getApplication())
        PaymentConfiguration.init(context, BridgeRunners.PUBLISHABLE_KEY)
        val googlePay = requireNotNull(fixture.map("params")?.getMap("googlePay"))
        val request = GooglePayRequestHelper.createPaymentDataRequestJson(GooglePayJsonFactory(context), googlePay)
        BridgeObservation(roots = mapOf("googlePayRequest" to jsonValue(request)))
      },
      "StripeSdk.confirmPlatformPay" to { fixture ->
        val context = BridgeReactContext(RuntimeEnvironment.getApplication())
        val manager =
          GooglePayLauncherManager(
            context,
            requireNotNull(fixture.string("clientSecret")),
            if (fixture.boolean("isPaymentIntent")) {
              GooglePayLauncherManager.Mode.ForPayment
            } else {
              GooglePayLauncherManager.Mode.ForSetup
            },
            requireNotNull(fixture.map("params")?.getMap("googlePay")),
          ) { _, _ -> }
        BridgeObservation(roots = mapOf("googlePayLauncher" to manager))
      },
    )

  private fun idle() = shadowOf(Looper.getMainLooper()).idle()

  /**
   * presentCustomerSheet with a sheet initialised: the delay the manager posts its timeout with,
   * read off the paused main looper. The sheet is a mock, since presenting it needs the network.
   */
  private fun presentedSheetTimeout(params: ReadableMap): Map<String, Any?> {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    context.onHostResume(Robolectric.buildActivity(FragmentActivity::class.java).setup().get())
    val manager = CustomerSheetManager(context, JavaOnlyMap(), JavaOnlyMap(), FakePromise())
    val sheet = mock(CustomerSheet::class.java)
    manager.javaClass.getDeclaredField("customerSheet").apply { isAccessible = true }.set(manager, sheet)
    val module = StripeSdkModule(context)
    module.javaClass.getDeclaredField("customerSheetManager").apply { isAccessible = true }.set(module, manager)
    try {
      module.presentCustomerSheet(params, FakePromise())
      idle()
      verify(sheet).present()
      val looper = shadowOf(Looper.getMainLooper())
      return mapOf("scheduledMillis" to (looper.nextScheduledTaskTime.toMillis() - SystemClock.uptimeMillis()))
    } finally {
      module.invalidate()
    }
  }

  /** org.json values as plain maps and lists, so dot paths resolve into them. */
  private fun jsonValue(value: Any?): Any? =
    when (value) {
      is JSONObject -> value.keys().asSequence().associateWith { jsonValue(value.get(it)) }
      is JSONArray -> List(value.length()) { jsonValue(value.get(it)) }
      JSONObject.NULL -> null
      else -> value
    }

  private fun <T> withModule(run: (StripeSdkModule, BridgeReactContext) -> T): T {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = StripeSdkModule(context)
    try {
      return run(module, context)
    } finally {
      module.invalidate()
    }
  }

  private fun initCustomerSheet(fixture: BridgeFixture): BridgeObservation {
    val params = requireNotNull(fixture.map("params"))
    val overrides = requireNotNull(fixture.map("customerAdapterOverrides"))
    val context = ModuleReactContext()
    val host = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val promise = FakePromise()
    PaymentConfiguration.init(context, BridgeRunners.PUBLISHABLE_KEY)
    context.onHostResume(host.get())
    val module = StripeSdkModule(context).also { context.module = it }
    val manager = CustomerSheetManager(context, params, overrides, promise)
    try {
      manager.create()
      idle()
      return BridgeObservation(
        roots =
          mapOf(
            "result" to BridgeRunners.settledValue(promise),
            "configuration" to runCatching { buildCustomerSheetConfiguration(params, context) }.getOrNull(),
            "customerAdapter" to manager.customerAdapter,
            "intentConfiguration" to manager.customerSessionProvider?.intentConfiguration,
          ),
      )
    } finally {
      manager.destroy()
      idle()
      module.invalidate()
      context.onHostPause()
      context.onHostDestroy()
      host.pause().stop().destroy()
    }
  }

  /**
   * Initializes CustomerSheet with an ephemeral key and every adapter override through
   * StripeSdkModule, then lets [deliver] install the deferred the adapter would await.
   */
  private fun adapterCallback(
    deliver: (StripeSdkModule, ReactNativeCustomerAdapter, FakePromise) -> CompletableDeferred<*>,
  ): BridgeObservation {
    val context = ModuleReactContext()
    val host = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    context.onHostResume(host.get())
    val module = StripeSdkModule(context).also { context.module = it }
    PaymentConfiguration.init(context, BridgeRunners.PUBLISHABLE_KEY)
    val overrides = JavaOnlyMap()
    for (name in ADAPTER_OVERRIDES) overrides.putBoolean(name, true)
    val manager =
      CustomerSheetManager(
        context,
        JavaOnlyMap.of(
          "merchantDisplayName",
          "Bridge Contracts, Inc.",
          "customerId",
          "cus_bridge_contracts",
          "customerEphemeralKeySecret",
          "ek_test_bridge_contracts",
        ),
        overrides,
        FakePromise(),
      )
    try {
      manager.create()
      idle()
      // StripeSdkModule.initCustomerSheet stores the manager here after its own init check.
      StripeSdkModule::class.java.getDeclaredField("customerSheetManager").apply {
        isAccessible = true
        set(module, manager)
      }
      val adapter = requireNotNull(manager.customerAdapter) { "CustomerSheet did not build an adapter" }
      val promise = FakePromise()
      val deferred = deliver(module, adapter, promise)
      idle()
      return BridgeObservation(
        roots =
          mapOf(
            "result" to BridgeRunners.settledValue(promise),
            "delivered" to deferred.completedOrNull(),
          ),
        aliases = PAYMENT_METHOD_ALIASES,
      )
    } finally {
      manager.destroy()
      idle()
      module.invalidate()
      context.onHostPause()
      context.onHostDestroy()
      host.pause().stop().destroy()
    }
  }

  private fun fetchPaymentMethodsCallback(fixture: BridgeFixture): BridgeObservation {
    val paymentMethods = requireNotNull(fixture.array("paymentMethods"))
    if (paymentMethods.size() == 0) {
      return BridgeRunners.moduleResult { module, promise ->
        module.customerAdapterFetchPaymentMethodsCallback(paymentMethods, promise)
      }
    }
    return adapterCallback { module, adapter, promise ->
      val deferred = CompletableDeferred<List<PaymentMethod>>()
      adapter.fetchPaymentMethodsCallback = deferred
      module.customerAdapterFetchPaymentMethodsCallback(paymentMethods, promise)
      deferred
    }
  }

  @OptIn(ExperimentalCoroutinesApi::class)
  private fun CompletableDeferred<*>.completedOrNull(): Any? = if (isCompleted) getCompleted() else null

  private val ADAPTER_OVERRIDES =
    listOf(
      "fetchPaymentMethods",
      "attachPaymentMethod",
      "detachPaymentMethod",
      "setSelectedPaymentOption",
      "fetchSelectedPaymentOption",
      "setupIntentClientSecretForCustomerAttach",
    )

  private val PAYMENT_METHOD_ALIASES =
    mapOf(
      "delivered.0.card.expMonth" to "delivered.0.card.expiryMonth",
      "delivered.0.card.expYear" to "delivered.0.card.expiryYear",
    )
}
