package com.reactnativestripesdk.addresssheet

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import com.stripe.android.paymentsheet.addresselement.AddressLauncherResult

@OptIn(ReactNativeSdkInternal::class)
class AddressLauncherManager(
  context: ReactApplicationContext,
  appearance: PaymentSheet.Appearance,
  defaultAddress: AddressDetails?,
  allowedCountries: Set<String>,
  buttonTitle: String?,
  title: String?,
  googlePlacesApiKey: String?,
  autocompleteCountries: Set<String>,
  additionalFields: AddressLauncher.AdditionalFieldsConfiguration?,
  private var callback: ((error: WritableMap?, address: AddressDetails?) -> Unit),
) : StripeUIManager(context) {
  companion object {
    internal var publishableKey: String? = null
  }

  private lateinit var addressLauncher: AddressLauncher
  private var configuration =
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

  override fun onPresent() {
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return
    publishableKey?.let { publishableKey ->
      @SuppressLint("RestrictedApi")
      addressLauncher =
        AddressLauncher(activity, signal, ::onAddressLauncherResult).also {
          it.present(publishableKey = publishableKey, configuration = configuration)
        }
    }
      ?: run {
        callback.invoke(
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
        callback.invoke(
          createError(ErrorType.Canceled.toString(), "The flow has been canceled."),
          null,
        )
      }
      is AddressLauncherResult.Succeeded -> {
        callback.invoke(null, result.address)
      }
    }
  }
}
