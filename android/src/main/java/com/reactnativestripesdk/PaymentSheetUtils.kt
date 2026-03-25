package com.reactnativestripesdk

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.util.Base64
import androidx.core.graphics.createBitmap
import androidx.core.graphics.drawable.DrawableCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.PaymentSheetErrorType
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.forEachKey
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.io.ByteArrayOutputStream
import kotlin.coroutines.resume

suspend fun waitForDrawableToLoad(
  drawable: Drawable,
  timeoutMs: Long = 3000,
): Drawable {
  // If already loaded, return immediately
  if (drawable.intrinsicWidth > 1 && drawable.intrinsicHeight > 1) {
    return drawable
  }

  // Use callback to be notified when drawable finishes loading
  return withTimeoutOrNull(timeoutMs) {
    suspendCancellableCoroutine { continuation ->
      val callback =
        object : Drawable.Callback {
          override fun invalidateDrawable(who: Drawable) {
            // Drawable has changed/loaded - check if it's ready now
            if (who.intrinsicWidth > 1 && who.intrinsicHeight > 1) {
              who.callback = null // Remove callback
              if (continuation.isActive) {
                continuation.resume(who)
              }
            }
          }

          override fun scheduleDrawable(
            who: Drawable,
            what: Runnable,
            `when`: Long,
          ) {}

          override fun unscheduleDrawable(
            who: Drawable,
            what: Runnable,
          ) {}
        }

      drawable.callback = callback

      // Trigger an invalidation to check if it loads immediately
      drawable.invalidateSelf()

      continuation.invokeOnCancellation { drawable.callback = null }
    }
  } ?: drawable // Return drawable even if timeout (best effort)
}

suspend fun convertDrawableToBase64(drawable: Drawable): String? {
  val loadedDrawable = waitForDrawableToLoad(drawable)
  val bitmap = getBitmapFromDrawable(loadedDrawable)
  return getBase64FromBitmap(bitmap)
}

fun getBitmapFromDrawable(drawable: Drawable): Bitmap? {
  val drawableCompat = DrawableCompat.wrap(drawable).mutate()

  // Determine the size to use - prefer intrinsic size, fall back to bounds
  val width =
    if (drawableCompat.intrinsicWidth > 0) {
      drawableCompat.intrinsicWidth
    } else {
      drawableCompat.bounds.width()
    }

  val height =
    if (drawableCompat.intrinsicHeight > 0) {
      drawableCompat.intrinsicHeight
    } else {
      drawableCompat.bounds.height()
    }

  if (width <= 0 || height <= 0) {
    return null
  }

  val bitmap = createBitmap(width, height, Bitmap.Config.ARGB_8888)
  bitmap.eraseColor(Color.TRANSPARENT)
  val canvas = Canvas(bitmap)
  drawableCompat.setBounds(0, 0, canvas.width, canvas.height)
  drawableCompat.draw(canvas)

  return bitmap
}

fun getBase64FromBitmap(bitmap: Bitmap?): String? {
  if (bitmap == null) {
    return null
  }
  val stream = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
  val imageBytes: ByteArray = stream.toByteArray()
  return Base64.encodeToString(imageBytes, Base64.DEFAULT)
}

fun mapToPaymentMethodLayout(str: String?): PaymentSheet.PaymentMethodLayout =
  when (str) {
    "Horizontal" -> PaymentSheet.PaymentMethodLayout.Horizontal
    "Vertical" -> PaymentSheet.PaymentMethodLayout.Vertical
    else -> PaymentSheet.PaymentMethodLayout.Automatic
  }

internal fun mapToSetupFutureUse(type: String?): PaymentSheet.IntentConfiguration.SetupFutureUse? =
  when (type) {
    "OffSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OffSession
    "OnSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OnSession
    "None" -> PaymentSheet.IntentConfiguration.SetupFutureUse.None
    else -> null
  }

internal fun mapToCaptureMethod(type: String?): PaymentSheet.IntentConfiguration.CaptureMethod =
  when (type) {
    "Automatic" -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
    "Manual" -> PaymentSheet.IntentConfiguration.CaptureMethod.Manual
    "AutomaticAsync" -> PaymentSheet.IntentConfiguration.CaptureMethod.AutomaticAsync
    else -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
  }

@OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
internal fun mapToPaymentMethodOptions(options: ReadableMap?): PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions? {
  val sfuMap = options?.getMap("setupFutureUsageValues")
  val paymentMethodToSfuMap = mutableMapOf<PaymentMethod.Type, PaymentSheet.IntentConfiguration.SetupFutureUse>()
  sfuMap?.forEachKey { code ->
    val sfuValue = mapToSetupFutureUse(sfuMap.getString(code))
    val paymentMethodType = PaymentMethod.Type.fromCode(code)
    if (paymentMethodType != null && sfuValue != null) {
      paymentMethodToSfuMap[paymentMethodType] = sfuValue
    }
  }
  return if (paymentMethodToSfuMap.isNotEmpty()) {
    PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions(
      setupFutureUsageValues = paymentMethodToSfuMap,
    )
  } else {
    null
  }
}

internal fun handleFlowControllerConfigured(
  success: Boolean,
  error: Throwable?,
  promise: Promise,
  flowController: PaymentSheet.FlowController?,
) {
  if (!success) {
    promise.resolve(
      createError(
        PaymentSheetErrorType.Failed.toString(),
        error?.message ?: "Failed to configure payment sheet",
      ),
    )
    return
  }
  flowController?.getPaymentOption()?.let { paymentOption ->
    CoroutineScope(Dispatchers.Default).launch {
      val imageString =
        try {
          convertDrawableToBase64(paymentOption.icon())
        } catch (e: Exception) {
          val result =
            createError(
              PaymentSheetErrorType.Failed.toString(),
              "Failed to process payment option image: ${e.message}",
            )
          promise.resolve(result)
          return@launch
        }

      val option: WritableMap = Arguments.createMap()
      option.putString("label", paymentOption.label)
      option.putString("image", imageString)
      val result = createResult("paymentOption", option)
      promise.resolve(result)
    }
  } ?: run {
    promise.resolve(Arguments.createMap())
  }
}
