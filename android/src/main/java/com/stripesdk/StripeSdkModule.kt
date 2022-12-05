package com.stripesdk

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.core.AppInfo
import com.stripesdk.utils.getBooleanOrFalse
import com.stripesdk.utils.getMapOrNull
import com.stripesdk.utils.getValOr
import java.lang.Exception


class StripeSdkModule constructor(context: ReactApplicationContext) : StripeSdkSpec(context) {


  private lateinit var stripe: Stripe
  private lateinit var publishableKey: String
  private var stripeAccountId: String? = null
  private var urlScheme: String? = null

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  override fun initialise(params: ReadableMap?, promise: Promise?) {
    try {
      val publishableKey = getValOr(params, "publishableKey", null) as String
      val appInfo = getMapOrNull(params, "appInfo") as ReadableMap
      this.stripeAccountId = getValOr(params, "stripeAccountId", null)
      val urlScheme = getValOr(params, "urlScheme", null)
      val setReturnUrlSchemeOnAndroid = getBooleanOrFalse(params, "setReturnUrlSchemeOnAndroid")
      this.urlScheme = if (setReturnUrlSchemeOnAndroid) urlScheme else null

      getMapOrNull(params, "threeDSecureParams")?.let {
        // TODO
//      configure3dSecure(it)
      }

      this.publishableKey = publishableKey
      //TODO
//    AddressLauncherFragment.publishableKey = publishableKey

      val name = getValOr(appInfo, "name", "") as String
      val partnerId = getValOr(appInfo, "partnerId", "")
      val version = getValOr(appInfo, "version", "")

      val url = getValOr(appInfo, "url", "")
      Stripe.appInfo = AppInfo.create(name, version, url, partnerId)
      stripe = Stripe(reactApplicationContext, publishableKey, stripeAccountId)

      PaymentConfiguration.init(reactApplicationContext, publishableKey, stripeAccountId)
      promise?.resolve(null)
    } catch (e: Exception){
      promise?.reject(e);
    }
  }

  @ReactMethod
  override fun createPaymentMethod(params: ReadableMap?, options: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun handleNextAction(
    paymentIntentClientSecret: String?,
    returnURL: String?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun confirmPayment(
    paymentIntentClientSecret: String?,
    params: ReadableMap?,
    options: ReadableMap?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun isApplePaySupported(promise: Promise?) {

  }

  @ReactMethod
  override fun presentApplePay(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun confirmApplePayPayment(clientSecret: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun updateApplePaySummaryItems(
    summaryItems: ReadableMap?,
    errorAddressFields: ReadableArray?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun confirmSetupIntent(
    paymentIntentClientSecret: String?,
    params: ReadableMap?,
    options: ReadableMap?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun retrievePaymentIntent(clientSecret: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun retrieveSetupIntent(clientSecret: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun initPaymentSheet(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun presentPaymentSheet(promise: Promise?) {

  }

  @ReactMethod
  override fun confirmPaymentSheetPayment(promise: Promise?) {

  }

  @ReactMethod
  override fun createTokenForCVCUpdate(cvc: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun handleURLCallback(url: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun createToken(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun isGooglePaySupported(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun initGooglePay(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun presentGooglePay(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun createGooglePayPaymentMethod(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun openApplePaySetup(promise: Promise?) {

  }

  @ReactMethod
  override fun verifyMicrodeposits(
    isPaymentIntent: Boolean,
    clientSecret: String?,
    params: ReadableMap?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun collectBankAccount(
    isPaymentIntent: Boolean,
    clientSecret: String?,
    params: ReadableMap?,
    promise: Promise?
  ) {

  }

  @ReactMethod
  override fun getTypedExportedConstants(): MutableMap<String, Any> {
    return mutableMapOf<String, Any>()
  }

  @ReactMethod
  override fun canAddCardToWallet(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun isCardInWallet(params: ReadableMap?, promise: Promise?) {

  }

  @ReactMethod
  override fun collectBankAccountToken(clientSecret: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun collectFinancialConnectionsAccounts(clientSecret: String?, promise: Promise?) {

  }

  @ReactMethod
  override fun resetPaymentSheetCustomer(promise: Promise?) {

  }

  companion object {
    const val NAME = "StripeSdk"
  }
}
