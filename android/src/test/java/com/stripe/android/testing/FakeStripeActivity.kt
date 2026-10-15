package com.stripe.android.testing

import android.app.Activity
import app.cash.turbine.Turbine

// Matches the package prefix used by StripeSdkModule's lifecycle callback.
internal class FakeStripeActivity : Activity() {
  val finishCalls = Turbine<Unit>()

  override fun finish() {
    finishCalls.add(Unit)
  }
}
