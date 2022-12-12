package com.reactnativestripesdk

import com.facebook.react.bridge.*

abstract class StripeSdkSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {


  abstract fun initialise(params: ReadableMap, promise: Promise)


  abstract fun createPaymentMethod(params: ReadableMap, options: ReadableMap, promise: Promise)


  abstract fun handleNextAction(
    paymentIntentClientSecret: String?,
    returnURL: String?,
    promise: Promise?
  )


  abstract fun confirmPayment(
    paymentIntentClientSecret: String,
    params: ReadableMap,
    options: ReadableMap,
    promise: Promise
  )

  abstract fun isApplePaySupported(promise: Promise)

  abstract fun presentApplePay(params: ReadableMap, promise: Promise)

  abstract fun confirmApplePayPayment(clientSecret: ReadableMap, promise: Promise)

  abstract fun updateApplePaySummaryItems(
    summaryItems: ReadableMap,
    errorAddressFields: ReadableArray,
    promise: Promise
  )

  abstract fun confirmSetupIntent(
    paymentIntentClientSecret: String,
    params: ReadableMap,
    options: ReadableMap,
    promise: Promise
  )

  abstract fun retrievePaymentIntent(clientSecret: String, promise: Promise)

  abstract fun retrieveSetupIntent(clientSecret: String, promise: Promise)

  abstract fun initPaymentSheet(params: ReadableMap, promise: Promise)

  abstract fun presentPaymentSheet(promise: Promise)

  abstract fun confirmPaymentSheetPayment(promise: Promise)

  abstract fun createTokenForCVCUpdate(cvc: String, promise: Promise)

  abstract fun handleURLCallback(url: String, promise: Promise)

  abstract fun createToken(params: ReadableMap, promise: Promise)

  abstract fun isGooglePaySupported(params: ReadableMap, promise: Promise)

  abstract fun initGooglePay(params: ReadableMap, promise: Promise)

  abstract fun presentGooglePay(params: ReadableMap, promise: Promise)

  abstract fun createGooglePayPaymentMethod(params: ReadableMap, promise: Promise)

  abstract fun openApplePaySetup(promise: Promise)

  abstract fun verifyMicrodeposits(
    isPaymentIntent: Boolean,
    clientSecret: String,
    params: ReadableMap,
    promise: Promise
  )

  abstract fun collectBankAccount(
    isPaymentIntent: Boolean,
    clientSecret: String,
    params: ReadableMap,
    promise: Promise
  )

  protected abstract fun getTypedExportedConstants(): Map<String, Any>

  abstract fun canAddCardToWallet(params: ReadableMap, promise: Promise)

  abstract fun isCardInWallet(params: ReadableMap, promise: Promise)

  abstract fun collectBankAccountToken(clientSecret: String, promise: Promise)

  abstract fun collectFinancialConnectionsAccounts(clientSecret: String, promise: Promise)

  abstract fun resetPaymentSheetCustomer(promise: Promise)
}
