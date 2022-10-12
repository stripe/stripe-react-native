package com.reactnativestripesdk.addresssheet

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.ReactContext
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import com.stripe.android.paymentsheet.addresselement.AddressLauncherResult

object AddressLauncherFragment : Fragment() {
  private const val TAG = "address_launcher_fragment"
  private lateinit var addressLauncher: AddressLauncher
  private var configuration = AddressLauncher.Configuration()
  private var callback: ((AddressLauncherResult) -> Unit)? = null
  internal var shippingDetailsForPaymentSheet: AddressDetails? = null
  internal var publishableKey: String? = null

  override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                            savedInstanceState: Bundle?): View {
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    publishableKey?.let { publishableKey ->
      addressLauncher = AddressLauncher(this,
                                        AddressLauncherFragment::onAddressLauncherResult).also {
        it.present(
          publishableKey = publishableKey,
          configuration = configuration
        )
      }
    } ?: run {
      Log.e("StripeReactNative", "No publishable key set. Stripe has not been initialized. Initialize Stripe in your app with the StripeProvider component or the initStripe method.")
    }
  }

  private fun onAddressLauncherResult(result: AddressLauncherResult) {
    callback?.let {
      // set shippingDetailsForPaymentSheet
      it(result)
    }
  }

  fun presentAddressSheet(
    context: ReactContext,
    appearance: PaymentSheet.Appearance,
    defaultAddress: AddressDetails?,
    allowedCountries: Set<String>,
    buttonTitle: String?,
    title: String?,
    googlePlacesApiKey: String?,
    autocompleteCountries: Set<String>,
    additionalFields: AddressLauncher.AdditionalFieldsConfiguration?,
    callback: (result: AddressLauncherResult) -> Unit) {
    configuration = AddressLauncher.Configuration(
      appearance = appearance,
      address = defaultAddress,
      allowedCountries = allowedCountries,
      buttonTitle = buttonTitle,
      additionalFields = additionalFields,
      title = title,
      googlePlacesApiKey = googlePlacesApiKey,
      autocompleteCountries = autocompleteCountries,
    )
    AddressLauncherFragment.callback = callback
    (context.currentActivity as? AppCompatActivity)?.let {
      attemptToCleanupPreviousFragment(it)
      commitFragmentAndStartFlow(it)
    }
  }

  private fun attemptToCleanupPreviousFragment(currentActivity: AppCompatActivity) {
    currentActivity.supportFragmentManager.beginTransaction()
      .remove(this)
      .commitAllowingStateLoss()
  }

  private fun commitFragmentAndStartFlow(currentActivity: AppCompatActivity) {
    try {
      currentActivity.supportFragmentManager.beginTransaction()
        .add(this, TAG)
        .commit()
    } catch (_: IllegalStateException) {}
  }
}
