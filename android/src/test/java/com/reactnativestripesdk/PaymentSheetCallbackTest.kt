package com.reactnativestripesdk

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.google.common.truth.Truth.assertThat
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentelement.CreateIntentWithConfirmationTokenCallback
import com.stripe.android.paymentsheet.CreateIntentCallback
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.mockito.Mockito.RETURNS_SELF
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockConstruction
import org.mockito.Mockito.verify
import org.mockito.Mockito.withSettings
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
@OptIn(ReactNativeSdkInternal::class)
class PaymentSheetCallbackTest {
  @Test
  fun flowControllerRebuildsWhenCallbackChanges() {
    val settings = withSettings().defaultAnswer(RETURNS_SELF)
    mockConstruction(PaymentSheet.FlowController.Builder::class.java, settings) { builder, _ ->
      Mockito.`when`(builder.build(any(FragmentActivity::class.java)))
        .thenReturn(mock(PaymentSheet.FlowController::class.java))
    }.use { builders ->
      runScenario { manager, promise ->
        callbackSequence.forEachIndexed { index, kind ->
          manager.configure(arguments(kind), promise)
          assertThat(builders.constructed()).hasSize(index + 1)
          assertCallback(builders.constructed().last(), kind)

          // Reusing the same callback type must preserve the existing controller.
          manager.configure(arguments(kind), promise)
          assertThat(builders.constructed()).hasSize(index + 1)
        }
      }
    }
  }

  private fun assertCallback(builder: PaymentSheet.FlowController.Builder, kind: CallbackKind) {
    verify(builder, Mockito.times(if (kind == CallbackKind.IntentCreation) 1 else 0))
      .createIntentCallback(any(CreateIntentCallback::class.java))
    verify(builder, Mockito.times(if (kind == CallbackKind.ConfirmationToken) 1 else 0))
      .createIntentCallback(any(CreateIntentWithConfirmationTokenCallback::class.java))
  }

  private fun runScenario(block: (PaymentSheetManager, FakePromise) -> Unit) {
    val activityController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    context.onHostResume(activityController.get())
    val promise = FakePromise()
    val manager = PaymentSheetManager(context, JavaOnlyMap(), promise)
    try {
      block(manager, promise)
    } finally {
      manager.destroy()
      shadowOf(Looper.getMainLooper()).idle()
      context.onHostPause()
      context.onHostDestroy()
      context.destroy()
      activityController.pause().stop().destroy()
    }
    promise.ensureAllEventsConsumed()
  }

  private fun arguments(kind: CallbackKind): JavaOnlyMap =
    JavaOnlyMap.of(
      "merchantDisplayName", "Callback switching test",
      "customFlow", true,
    ).apply {
      if (kind == CallbackKind.None) {
        putString("paymentIntentClientSecret", "pi_test_secret_test")
      } else {
        putMap(
          "intentConfiguration",
          JavaOnlyMap.of("mode", JavaOnlyMap.of("amount", 1000, "currencyCode", "usd")).apply {
            val handler =
              if (kind == CallbackKind.ConfirmationToken) {
                "confirmationTokenConfirmHandler"
              } else {
                "confirmHandler"
              }
            putBoolean(handler, true)
          },
        )
      }
    }

  private fun <T> any(type: Class<T>): T = Mockito.any(type)

  private enum class CallbackKind { None, IntentCreation, ConfirmationToken }

  private val callbackSequence = listOf(
    CallbackKind.ConfirmationToken,
    CallbackKind.None,
    CallbackKind.IntentCreation,
    CallbackKind.ConfirmationToken,
    CallbackKind.IntentCreation,
    CallbackKind.None,
    CallbackKind.ConfirmationToken,
  )
}
