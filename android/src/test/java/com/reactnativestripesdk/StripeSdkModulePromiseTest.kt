package com.reactnativestripesdk

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import com.reactnativestripesdk.customersheet.CustomerSheetManager
import com.reactnativestripesdk.utils.readableArrayOf
import com.stripe.android.model.PaymentMethod
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode
import org.robolectric.util.ReflectionHelpers

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class StripeSdkModulePromiseTest {
  @Test
  fun updateEmbeddedPaymentElement_resolvesFailedInsteadOfHanging() = runTest {
    runWithModule { module ->
      val promise = FakePromise()
      module.updateEmbeddedPaymentElement(JavaOnlyMap(), promise)
      val result = promise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.getMap("error")?.getString("code")).isEqualTo("Failed")
      assertThat(result.getMap("error")?.getString("message"))
        .isEqualTo("not supported on Android; use the hook's update")
      promise.ensureAllEventsConsumed()
    }
  }

  @Test
  fun dismissPlatformPay_resolvesFalse() = runTest {
    runWithModule { module ->
      val promise = FakePromise()
      module.dismissPlatformPay(promise)
      assertThat(promise.resolveCalls.awaitItem().value).isEqualTo(false)
      promise.ensureAllEventsConsumed()
    }
  }

  @Test
  fun updatePlatformPaySheet_resolvesEmptyMap() = runTest {
    runWithModule { module ->
      val promise = FakePromise()
      module.updatePlatformPaySheet(null, null, null, promise)
      val result = promise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.toHashMap()).isEmpty()
      promise.ensureAllEventsConsumed()
    }
  }

  @Test
  fun intentCreationCallback_resolvesNullWhenOnlyEmbeddedIsWaiting() = runTest {
    runWithModule { module ->
      val promise = FakePromise()
      module.intentCreationCallback(JavaOnlyMap.of("clientSecret", "pi_secret"), promise)
      assertThat(promise.resolveCalls.awaitItem().value).isNull()
      promise.ensureAllEventsConsumed()
      assertThat(module.embeddedIntentCreationCallback.isCompleted).isTrue()
    }
  }

  @Test
  fun confirmationTokenCreationCallback_resolvesNullWhenOnlyEmbeddedIsWaiting() = runTest {
    runWithModule { module ->
      val promise = FakePromise()
      module.confirmationTokenCreationCallback(JavaOnlyMap.of("clientSecret", "ct_secret"), promise)
      assertThat(promise.resolveCalls.awaitItem().value).isNull()
      promise.ensureAllEventsConsumed()
      assertThat(module.embeddedConfirmationTokenCreationCallback.isCompleted).isTrue()
      assertThat(module.paymentSheetConfirmationTokenCreationCallback.isCompleted).isTrue()
    }
  }

  @Test
  fun customerAdapterCallbacks_resolveOnceAfterComplete() = runTest {
    runWithModule { module ->
      val adapter = mock(ReactNativeCustomerAdapter::class.java)
      val fetchDeferred = CompletableDeferred<List<PaymentMethod>>()
      val attachDeferred = CompletableDeferred<PaymentMethod>()
      val detachDeferred = CompletableDeferred<PaymentMethod>()
      val setSelectedDeferred = CompletableDeferred<Unit>()
      val fetchSelectedDeferred = CompletableDeferred<String?>()
      val setupIntentDeferred = CompletableDeferred<String>()
      `when`(adapter.fetchPaymentMethodsCallback).thenReturn(fetchDeferred)
      `when`(adapter.attachPaymentMethodCallback).thenReturn(attachDeferred)
      `when`(adapter.detachPaymentMethodCallback).thenReturn(detachDeferred)
      `when`(adapter.setSelectedPaymentOptionCallback).thenReturn(setSelectedDeferred)
      `when`(adapter.fetchSelectedPaymentOptionCallback).thenReturn(fetchSelectedDeferred)
      `when`(adapter.setupIntentClientSecretForCustomerAttachCallback).thenReturn(setupIntentDeferred)

      val manager = mock(CustomerSheetManager::class.java)
      `when`(manager.customerAdapter).thenReturn(adapter)
      ReflectionHelpers.setField(module, "customerSheetManager", manager)

      assertSettlesOnce { promise ->
        module.customerAdapterFetchPaymentMethodsCallback(JavaOnlyArray(), promise)
      }
      assertThat(fetchDeferred.isCompleted).isTrue()

      assertSettlesOnce { promise ->
        module.customerAdapterAttachPaymentMethodCallback(paymentMethodMap(), promise)
      }
      assertThat(attachDeferred.isCompleted).isTrue()
      assertThat(attachDeferred.getCompletionExceptionOrNull()).isNull()

      assertSettlesOnce { promise ->
        module.customerAdapterDetachPaymentMethodCallback(paymentMethodMap(), promise)
      }
      assertThat(detachDeferred.isCompleted).isTrue()
      assertThat(detachDeferred.getCompletionExceptionOrNull()).isNull()

      assertSettlesOnce { promise ->
        module.customerAdapterSetSelectedPaymentOptionCallback(promise)
      }
      assertThat(setSelectedDeferred.isCompleted).isTrue()

      assertSettlesOnce { promise ->
        module.customerAdapterFetchSelectedPaymentOptionCallback("pm_123", promise)
      }
      assertThat(fetchSelectedDeferred.isCompleted).isTrue()
      assertThat(fetchSelectedDeferred.getCompletionExceptionOrNull()).isNull()

      assertSettlesOnce { promise ->
        module.customerAdapterSetupIntentClientSecretForCustomerAttachCallback("seti_secret", promise)
      }
      assertThat(setupIntentDeferred.isCompleted).isTrue()
      assertThat(setupIntentDeferred.getCompletionExceptionOrNull()).isNull()
    }
  }

  @Test
  fun customerAdapterAttachAndDetach_decodeFailuresSettleFailed() = runTest {
    runWithModule { module ->
      val adapter = mock(ReactNativeCustomerAdapter::class.java)
      val attachDeferred = CompletableDeferred<PaymentMethod>()
      val detachDeferred = CompletableDeferred<PaymentMethod>()
      `when`(adapter.attachPaymentMethodCallback).thenReturn(attachDeferred)
      `when`(adapter.detachPaymentMethodCallback).thenReturn(detachDeferred)

      val manager = mock(CustomerSheetManager::class.java)
      `when`(manager.customerAdapter).thenReturn(adapter)
      ReflectionHelpers.setField(module, "customerSheetManager", manager)

      // Empty maps do not decode to a Stripe PaymentMethod.
      val invalidPaymentMethodJson = JavaOnlyMap()

      val attachPromise = FakePromise()
      module.customerAdapterAttachPaymentMethodCallback(invalidPaymentMethodJson, attachPromise)
      val attachResult = attachPromise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(attachResult.getMap("error")?.getString("code")).isEqualTo("Failed")
      assertThat(attachDeferred.isCompleted).isTrue()
      assertThat(attachDeferred.getCompletionExceptionOrNull()).isNotNull()
      attachPromise.ensureAllEventsConsumed()

      val detachPromise = FakePromise()
      module.customerAdapterDetachPaymentMethodCallback(invalidPaymentMethodJson, detachPromise)
      val detachResult = detachPromise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(detachResult.getMap("error")?.getString("code")).isEqualTo("Failed")
      assertThat(detachDeferred.isCompleted).isTrue()
      assertThat(detachDeferred.getCompletionExceptionOrNull()).isNotNull()
      detachPromise.ensureAllEventsConsumed()
    }
  }

  @Test
  fun initCustomerSheet_withBothSecretsResolvesOnce() = runTest {
    val activityController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    context.onHostResume(activityController.get())
    val promise = FakePromise()
    val arguments =
      JavaOnlyMap.of(
        "merchantDisplayName",
        "Promise settle test",
        "customerId",
        "cus_test",
        "customerEphemeralKeySecret",
        "ek_test",
        "intentConfiguration",
        JavaOnlyMap.of("paymentMethodTypes", readableArrayOf("card")),
      )
    val manager = CustomerSheetManager(context, arguments, JavaOnlyMap(), promise)
    try {
      manager.create()
      shadowOf(Looper.getMainLooper()).idle()
      val result = promise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.getMap("error")?.getString("code")).isEqualTo("Failed")
      assertThat(result.getMap("error")?.getString("message"))
        .contains("but not both")
      promise.ensureAllEventsConsumed()
    } finally {
      manager.destroy()
      shadowOf(Looper.getMainLooper()).idle()
      context.onHostPause()
      context.onHostDestroy()
      context.destroy()
      activityController.pause().stop().destroy()
    }
  }

  private suspend fun assertSettlesOnce(block: (FakePromise) -> Unit) {
    val promise = FakePromise()
    block(promise)
    val value = promise.resolveCalls.awaitItem().value
    assertThat(value).isInstanceOf(WritableMap::class.java)
    assertThat((value as ReadableMap).hasKey("error")).isFalse()
    promise.ensureAllEventsConsumed()
  }

  private suspend fun runWithModule(block: suspend (StripeSdkModule) -> Unit) {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = StripeSdkModule(context)
    try {
      block(module)
    } finally {
      module.invalidate()
      shadowOf(Looper.getMainLooper()).idle()
      context.destroy()
    }
  }

  private fun paymentMethodMap(): JavaOnlyMap =
    JavaOnlyMap.of(
      "id",
      "pm_123",
      "object",
      "payment_method",
      "type",
      "card",
      "card",
      JavaOnlyMap.of("brand", "visa", "last4", "4242"),
    )
}
