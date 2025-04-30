package com.reactnativestripesdk.addresssheet

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeFragment
import com.reactnativestripesdk.utils.createError
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import com.stripe.android.paymentsheet.addresselement.AddressLauncherResult

class AddressLauncherFragment : StripeFragment() {
  companion object {
    internal var publishableKey: String? = null
    internal const val TAG = "address_launcher_fragment"
  }

  private lateinit var addressLauncher: AddressLauncher
  private var configuration = AddressLauncher.Configuration()
  private var callback: ((error: WritableMap?, address: AddressDetails?) -> Unit)? = null

  override fun prepare() {
    publishableKey?.let { publishableKey ->
      addressLauncher =
        AddressLauncher(this, ::onAddressLauncherResult).also {
          it.present(publishableKey = publishableKey, configuration = configuration)
        }
    }
      ?: run {
        callback?.invoke(
          createError(
            ErrorType.Failed.toString(),
            "No publishable key set. Stripe has not been initialized. Initialize Stripe in your app with the StripeProvider component or the initStripe method.",
          ),
          null,
        )
      }
  }

  private fun onAddressLauncherResult(result: AddressLauncherResult) {
    when (result) {
      is AddressLauncherResult.Canceled -> {
        callback?.invoke(
          createError(ErrorType.Canceled.toString(), "The flow has been canceled."),
          null,
        )
      }
      is AddressLauncherResult.Succeeded -> {
        callback?.invoke(null, result.address)
      }
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
    callback: ((error: WritableMap?, address: AddressDetails?) -> Unit),
  ) {
    configuration =
      AddressLauncher.Configuration(
        appearance = appearance,
        address = defaultAddress,
        allowedCountries = allowedCountries,
        buttonTitle = buttonTitle,
        additionalFields = additionalFields,
        title = title,
        googlePlacesApiKey = googlePlacesApiKey,
        autocompleteCountries = autocompleteCountries,
      )
    this.callback = callback
    (context.currentActivity as? FragmentActivity)?.let {
      attemptToCleanupPreviousFragment(it)
      commitFragmentAndStartFlow(it)
    }
  }

  private fun attemptToCleanupPreviousFragment(currentActivity: FragmentActivity) {
    currentActivity.supportFragmentManager
      .beginTransaction()
      .remove(this)
      .commitAllowingStateLoss()
  }

  private fun commitFragmentAndStartFlow(currentActivity: FragmentActivity) {
    try {
      currentActivity.supportFragmentManager
        .beginTransaction()
        .add(this, TAG)
        .commit()
    } catch (_: IllegalStateException) {
    }
  }
}
