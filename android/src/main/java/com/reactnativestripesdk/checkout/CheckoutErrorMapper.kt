package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException

internal fun checkoutErrorCode(error: Throwable): String = when (error) {
  is TimeoutCancellationException -> "Timeout"
  is CancellationException -> "Canceled"
  else -> "Failed"
}
