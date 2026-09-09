package com.reactnativestripesdk

import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.tasks.Task
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.PaymentDataRequest
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import com.google.android.gms.wallet.contract.ApiTaskResult
import com.google.android.gms.wallet.contract.TaskResultContracts
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntOr
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.reactnativestripesdk.utils.mapFromShippingContact
import com.reactnativestripesdk.utils.mapFromToken
import com.stripe.android.ApiResultCallback
import com.stripe.android.GooglePayJsonFactory
import com.stripe.android.Stripe
import com.stripe.android.model.GooglePayResult
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.PaymentMethodCreateParams
import org.json.JSONObject
import java.util.Locale
import java.util.UUID

class GooglePayRequestHelper {
  companion object {
    internal fun createPaymentRequest(
      activity: FragmentActivity,
      factory: GooglePayJsonFactory,
      googlePayParams: ReadableMap,
    ): Task<PaymentData> {
      val transactionInfo = buildTransactionInfo(googlePayParams)
      val merchantInfo =
        GooglePayJsonFactory.MerchantInfo(googlePayParams.getString("merchantName").orEmpty())
      val billingAddressParameters =
        buildBillingAddressParameters(googlePayParams.getMap("billingAddressConfig"))
      val shippingAddressParameters =
        buildShippingAddressParameters(googlePayParams.getMap("shippingAddressConfig"))

      val request =
        factory.createPaymentDataRequest(
          transactionInfo = transactionInfo,
          merchantInfo = merchantInfo,
          billingAddressParameters = billingAddressParameters,
          shippingAddressParameters = shippingAddressParameters,
          isEmailRequired = googlePayParams.getBooleanOr("isEmailRequired", false),
          allowCreditCards = googlePayParams.getBooleanOr("allowCreditCards", true),
        )

      val walletOptions =
        Wallet.WalletOptions
          .Builder()
          .setEnvironment(
            if (googlePayParams.getBooleanOr("testEnv", false)) {
              WalletConstants.ENVIRONMENT_TEST
            } else {
              WalletConstants.ENVIRONMENT_PRODUCTION
            },
          ).build()
      return Wallet
        .getPaymentsClient(activity, walletOptions)
        .loadPaymentData(PaymentDataRequest.fromJson(request.toString()))
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildShippingAddressParameters(params: ReadableMap?): GooglePayJsonFactory.ShippingAddressParameters {
      val isPhoneNumberRequired = params?.getBooleanOr("isPhoneNumberRequired", false)
      val isRequired = params?.getBooleanOr("isRequired", false)
      val allowedCountryCodes =
        if (params?.hasKey("allowedCountryCodes") == true) {
          params.getArray("allowedCountryCodes")?.toArrayList()?.toSet() as? Set<String>
        } else {
          null
        }

      return GooglePayJsonFactory.ShippingAddressParameters(
        isRequired = isRequired ?: false,
        allowedCountryCodes = allowedCountryCodes ?: Locale.getISOCountries().toSet(),
        phoneNumberRequired = isPhoneNumberRequired ?: false,
      )
    }

    private fun buildBillingAddressParameters(params: ReadableMap?): GooglePayJsonFactory.BillingAddressParameters {
      val isRequired = params?.getBooleanOr("isRequired", false)
      val isPhoneNumberRequired = params?.getBooleanOr("isPhoneNumberRequired", false)
      val format =
        when (params?.getString("format").orEmpty()) {
          "FULL" -> GooglePayJsonFactory.BillingAddressParameters.Format.Full
          "MIN" -> GooglePayJsonFactory.BillingAddressParameters.Format.Min
          else -> GooglePayJsonFactory.BillingAddressParameters.Format.Min
        }

      return GooglePayJsonFactory.BillingAddressParameters(
        isRequired = isRequired ?: false,
        format = format,
        isPhoneNumberRequired = isPhoneNumberRequired ?: false,
      )
    }

    private fun buildTransactionInfo(params: ReadableMap): GooglePayJsonFactory.TransactionInfo {
      val countryCode = params.getString("merchantCountryCode").orEmpty()
      val currencyCode = params.getString("currencyCode") ?: "USD"
      val amount = params.getIntOr("amount", 0)
      val label = params.getString("label")

      return GooglePayJsonFactory.TransactionInfo(
        currencyCode = currencyCode,
        totalPriceStatus = GooglePayJsonFactory.TransactionInfo.TotalPriceStatus.Estimated,
        countryCode = countryCode,
        totalPrice = amount,
        totalPriceLabel = label,
        checkoutOption = GooglePayJsonFactory.TransactionInfo.CheckoutOption.Default,
      )
    }

    internal fun createPaymentMethod(
      request: Task<PaymentData>,
      activity: FragmentActivity,
      stripe: Stripe,
      forToken: Boolean,
      promise: Promise,
    ) {
      activity.runOnUiThread {
        lateinit var launcher: ActivityResultLauncher<Task<PaymentData>>
        launcher =
          activity.activityResultRegistry.register(
            "stripe-react-native-google-pay-${UUID.randomUUID()}",
            TaskResultContracts.GetPaymentDataResult(),
          ) { result ->
            launcher.unregister()
            handleGooglePaymentMethodResult(result, stripe, forToken, promise)
          }
        launcher.launch(request)
      }
    }

    private fun handleGooglePaymentMethodResult(
      result: ApiTaskResult<PaymentData>,
      stripe: Stripe,
      forToken: Boolean,
      promise: Promise,
    ) {
      when {
        result.status.isSuccess -> {
          result.result?.let {
            if (forToken) {
              resolveWithToken(it, promise)
            } else {
              resolveWithPaymentMethod(it, stripe, promise)
            }
          } ?: promise.resolve(
            createError(ErrorType.Failed.toString(), "Google Pay did not return payment data"),
          )
        }
        result.status.statusCode == CommonStatusCodes.CANCELED -> {
          promise.resolve(
            createError(ErrorType.Canceled.toString(), "The payment has been canceled"),
          )
        }
        else -> {
          promise.resolve(
            createError(ErrorType.Failed.toString(), result.status.statusMessage),
          )
        }
      }
    }

    private fun resolveWithPaymentMethod(
      paymentData: PaymentData,
      stripe: Stripe,
      promise: Promise,
    ) {
      val paymentInformation = JSONObject(paymentData.toJson())
      val promiseResult = Arguments.createMap()
      stripe.createPaymentMethod(
        PaymentMethodCreateParams.createFromGooglePay(paymentInformation),
        callback =
          object : ApiResultCallback<PaymentMethod> {
            override fun onError(e: Exception) {
              promise.resolve(createError("Failed", e))
            }

            override fun onSuccess(result: PaymentMethod) {
              promiseResult.putMap("paymentMethod", mapFromPaymentMethod(result))
              GooglePayResult.fromJson(paymentInformation).let {
                if (it.shippingInformation != null) {
                  promiseResult.putMap("shippingContact", mapFromShippingContact(it))
                }
              }
              promise.resolve(promiseResult)
            }
          },
      )
    }

    private fun resolveWithToken(
      paymentData: PaymentData,
      promise: Promise,
    ) {
      val paymentInformation = JSONObject(paymentData.toJson())
      val googlePayResult = GooglePayResult.fromJson(paymentInformation)
      val promiseResult = Arguments.createMap()
      googlePayResult.token?.let {
        promiseResult.putMap("token", mapFromToken(it))
        if (googlePayResult.shippingInformation != null) {
          promiseResult.putMap("shippingContact", mapFromShippingContact(googlePayResult))
        }
        promise.resolve(promiseResult)
      }
        ?: run {
          promise.resolve(
            createError("Failed", "Unexpected response from Google Pay. No token was found."),
          )
        }
    }
  }
}
