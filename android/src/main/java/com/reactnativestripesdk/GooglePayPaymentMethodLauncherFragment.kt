package com.reactnativestripesdk

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.removeFragment
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher

class GooglePayPaymentMethodLauncherFragment : Fragment() {
  private lateinit var context: ReactApplicationContext
  private var isTestEnv = false
  private var paymentMethodRequired = false
  private lateinit var promise: Promise

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
  ): View = FrameLayout(requireActivity()).also { it.visibility = View.GONE }

  override fun onViewCreated(
    view: View,
    savedInstanceState: Bundle?,
  ) {
    super.onViewCreated(view, savedInstanceState)
    GooglePayPaymentMethodLauncher(
      this,
      config =
        GooglePayPaymentMethodLauncher.Config(
          environment =
            if (isTestEnv) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
          existingPaymentMethodRequired = paymentMethodRequired,
          merchantCountryCode =
            "", // Unnecessary since all we are checking for is Google Pay availability
          merchantName = "", // Same as above
        ),
      readyCallback = {
        promise.resolve(it)
        removeFragment(context)
      },
      resultCallback = {},
    )
  }

  companion object {
    const val TAG = "google_pay_support_fragment"

    fun create(
      context: ReactApplicationContext,
      isTestEnv: Boolean,
      paymentMethodRequired: Boolean,
      promise: Promise,
    ): GooglePayPaymentMethodLauncherFragment {
      val instance = GooglePayPaymentMethodLauncherFragment()
      instance.context = context
      instance.isTestEnv = isTestEnv
      instance.paymentMethodRequired = paymentMethodRequired
      instance.promise = promise
      return instance
    }
  }
}
