package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativestripesdk.addresssheet.AddressLauncherFragment
import com.reactnativestripesdk.customersheet.CustomerSheetFragment
import com.reactnativestripesdk.pushprovisioning.PushProvisioningProxy
import com.reactnativestripesdk.utils.ConfirmPaymentErrorType
import com.reactnativestripesdk.utils.CreateTokenErrorType
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.GooglePayErrorType
import com.reactnativestripesdk.utils.createCanAddCardResult
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createMissingInitError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getBooleanOrFalse
import com.reactnativestripesdk.utils.getMapOrNull
import com.reactnativestripesdk.utils.getValOr
import com.reactnativestripesdk.utils.mapFromPaymentIntentResult
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.reactnativestripesdk.utils.mapFromSetupIntentResult
import com.reactnativestripesdk.utils.mapFromToken
import com.reactnativestripesdk.utils.mapToAddress
import com.reactnativestripesdk.utils.mapToBankAccountType
import com.reactnativestripesdk.utils.mapToPaymentMethodType
import com.reactnativestripesdk.utils.mapToReturnURL
import com.reactnativestripesdk.utils.mapToShippingDetails
import com.reactnativestripesdk.utils.mapToUICustomization
import com.reactnativestripesdk.utils.removeFragment
import com.reactnativestripesdk.utils.toBundleObject
import com.stripe.android.ApiResultCallback
import com.stripe.android.GooglePayJsonFactory
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.core.ApiVersion
import com.stripe.android.core.AppInfo
import com.stripe.android.googlepaylauncher.GooglePayLauncher
import com.stripe.android.model.BankAccountTokenParams
import com.stripe.android.model.CardParams
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.SetupIntent
import com.stripe.android.model.Token
import com.stripe.android.payments.bankaccount.CollectBankAccountConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

@ReactModule(name = StripeSdkModule.NAME)
class StripeSdkModule(
  reactContext: ReactApplicationContext,
) : NativeStripeSdkModuleSpec(reactContext) {
  var cardFieldView: CardFieldView? = null
  var cardFormView: CardFormView? = null

  private lateinit var stripe: Stripe
  private lateinit var publishableKey: String
  private var stripeAccountId: String? = null
  private var urlScheme: String? = null

  private var createPlatformPayPaymentMethodPromise: Promise? = null
  private var platformPayUsesDeprecatedTokenFlow = false

  private var paymentSheetFragment: PaymentSheetFragment? = null
  private var paymentLauncherFragment: PaymentLauncherFragment? = null
  private var collectBankAccountLauncherFragment: CollectBankAccountLauncherFragment? = null

  private var customerSheetFragment: CustomerSheetFragment? = null

  internal var embeddedIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var customPaymentMethodResultCallback = CompletableDeferred<ReadableMap>()

  internal var composeCompatView: StripeAbstractComposeView.CompatView? = null

  // If you create a new Fragment, you must put the tag here, otherwise result callbacks for that
  // Fragment will not work on RN < 0.65
  private val allStripeFragmentTags: List<String>
    get() =
      listOf(
        PaymentSheetFragment.TAG,
        PaymentLauncherFragment.TAG,
        CollectBankAccountLauncherFragment.TAG,
        FinancialConnectionsSheetFragment.TAG,
        AddressLauncherFragment.TAG,
        GooglePayLauncherFragment.TAG,
        CustomerSheetFragment.TAG,
      )

  private val mActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (::stripe.isInitialized) {
          when (requestCode) {
            GooglePayRequestHelper.LOAD_PAYMENT_DATA_REQUEST_CODE -> {
              createPlatformPayPaymentMethodPromise?.let {
                GooglePayRequestHelper.handleGooglePaymentMethodResult(
                  resultCode,
                  data,
                  stripe,
                  platformPayUsesDeprecatedTokenFlow,
                  it,
                )
                createPlatformPayPaymentMethodPromise = null
              } ?: run {
                Log.d(
                  "StripeReactNative",
                  "No promise was found, Google Pay result went unhandled,",
                )
              }
            }

            else -> {
              dispatchActivityResultsToFragments(requestCode, resultCode, data)
            }
          }
        }
      }
    }

  init {
    reactContext.addActivityEventListener(mActivityEventListener)
  }

  // Necessary on older versions of React Native (~0.65 and below)
  private fun dispatchActivityResultsToFragments(
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    getCurrentActivityOrResolveWithError(null)?.supportFragmentManager?.let { fragmentManager ->
      for (tag in allStripeFragmentTags) {
        fragmentManager.findFragmentByTag(tag)?.let {
          it.activity?.activityResultRegistry?.dispatchResult(requestCode, resultCode, data)
        }
      }
    }
  }

  private fun configure3dSecure(params: ReadableMap) {
    val stripe3dsConfigBuilder = PaymentAuthConfig.Stripe3ds2Config.Builder()
    if (params.hasKey("timeout")) stripe3dsConfigBuilder.setTimeout(params.getInt("timeout"))
    val uiCustomization = mapToUICustomization(params)

    PaymentAuthConfig.init(
      PaymentAuthConfig
        .Builder()
        .set3ds2Config(
          stripe3dsConfigBuilder
            .setUiCustomization(uiCustomization)
            .build(),
        ).build(),
    )
  }

  @SuppressLint("RestrictedApi")
  override fun getTypedExportedConstants() =
    mapOf(
      "API_VERSIONS" to
        mapOf(
          "CORE" to ApiVersion.API_VERSION_CODE,
          "ISSUING" to PushProvisioningProxy.getApiVersion(),
        ),
    )

  @ReactMethod
  override fun initialise(
    params: ReadableMap,
    promise: Promise,
  ) {
    val publishableKey = getValOr(params, "publishableKey", null) as String
    val appInfo = getMapOrNull(params, "appInfo") as ReadableMap
    this.stripeAccountId = getValOr(params, "stripeAccountId", null)
    val urlScheme = getValOr(params, "urlScheme", null)
    val setReturnUrlSchemeOnAndroid = getBooleanOrFalse(params, "setReturnUrlSchemeOnAndroid")
    this.urlScheme = if (setReturnUrlSchemeOnAndroid) urlScheme else null

    getMapOrNull(params, "threeDSecureParams")?.let {
      configure3dSecure(it)
    }

    this.publishableKey = publishableKey
    AddressLauncherFragment.publishableKey = publishableKey

    val name = getValOr(appInfo, "name", "") as String
    val partnerId = getValOr(appInfo, "partnerId", "")
    val version = getValOr(appInfo, "version", "")

    val url = getValOr(appInfo, "url", "")
    Stripe.appInfo = AppInfo.create(name, version, url, partnerId)
    stripe = Stripe(reactApplicationContext, publishableKey, stripeAccountId)

    PaymentConfiguration.init(reactApplicationContext, publishableKey, stripeAccountId)

    preventActivityRecreation()
    setupComposeCompatView()

    promise.resolve(null)
  }

  @ReactMethod
  override fun initPaymentSheet(
    params: ReadableMap,
    promise: Promise,
  ) {
    getCurrentActivityOrResolveWithError(promise)?.let { activity ->
      paymentSheetFragment?.removeFragment(reactApplicationContext)
      val bundle = toBundleObject(params)

      // Handle custom payment methods separately since toBundleObject cannot handle arrays of objects
      val customPaymentMethodConfig = params.getMap("customPaymentMethodConfiguration")
      if (customPaymentMethodConfig != null) {
        // Store the original ReadableMap for custom payment methods
        bundle.putSerializable("customPaymentMethodConfigurationReadableMap", customPaymentMethodConfig.toHashMap())
      }

      paymentSheetFragment =
        PaymentSheetFragment.create(reactApplicationContext, bundle, promise)
      try {
        activity.supportFragmentManager
          .beginTransaction()
          .add(paymentSheetFragment!!, PaymentSheetFragment.TAG)
          .commit()
      } catch (error: IllegalStateException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error.message))
      }
    }
  }

  @ReactMethod
  override fun presentPaymentSheet(
    options: ReadableMap,
    promise: Promise,
  ) {
    if (paymentSheetFragment == null) {
      promise.resolve(PaymentSheetFragment.createMissingInitError())
      return
    }

    val timeoutKey = "timeout"
    if (options.hasKey(timeoutKey)) {
      paymentSheetFragment?.presentWithTimeout(
        options.getInt(timeoutKey).toLong(),
        promise,
      )
    } else {
      paymentSheetFragment?.present(promise)
    }
  }

  @ReactMethod
  override fun confirmPaymentSheetPayment(promise: Promise) {
    if (paymentSheetFragment == null) {
      promise.resolve(PaymentSheetFragment.createMissingInitError())
      return
    }

    paymentSheetFragment?.confirmPayment(promise)
  }

  @ReactMethod
  override fun resetPaymentSheetCustomer(promise: Promise) {
    PaymentSheet.resetCustomer(context = reactApplicationContext)
    promise.resolve(null)
  }

  @ReactMethod
  override fun intentCreationCallback(
    params: ReadableMap,
    promise: Promise,
  ) {
    embeddedIntentCreationCallback.complete(params)

    if (paymentSheetFragment == null) {
      promise.resolve(PaymentSheetFragment.createMissingInitError())
      return
    }

    paymentSheetFragment?.paymentSheetIntentCreationCallback?.complete(params)
  }

  @ReactMethod
  override fun customPaymentMethodResultCallback(
    result: ReadableMap?,
    promise: Promise?,
  ) {
    // Complete the deferred with the result from JavaScript
    customPaymentMethodResultCallback.complete(result ?: Arguments.createMap())
    // Reset for next use
    customPaymentMethodResultCallback = CompletableDeferred()
    promise?.resolve(null)
  }

  @ReactMethod
  override fun createPaymentMethod(
    data: ReadableMap,
    options: ReadableMap,
    promise: Promise,
  ) {
    val paymentMethodType =
      getValOr(data, "paymentMethodType")?.let { mapToPaymentMethodType(it) } ?: run {
        promise.resolve(
          createError(
            ConfirmPaymentErrorType.Failed.toString(),
            "You must provide paymentMethodType",
          ),
        )
        return
      }
    val paymentMethodData = getMapOrNull(data, "paymentMethodData")
    val factory =
      PaymentMethodCreateParamsFactory(paymentMethodData, options, cardFieldView, cardFormView)
    try {
      val paymentMethodCreateParams = factory.createPaymentMethodParams(paymentMethodType)
      stripe.createPaymentMethod(
        paymentMethodCreateParams,
        callback =
          object : ApiResultCallback<PaymentMethod> {
            override fun onError(e: Exception) {
              promise.resolve(createError("Failed", e))
            }

            override fun onSuccess(result: PaymentMethod) {
              val paymentMethodMap: WritableMap = mapFromPaymentMethod(result)
              promise.resolve(createResult("paymentMethod", paymentMethodMap))
            }
          },
      )
    } catch (error: PaymentMethodCreateParamsException) {
      promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), error))
    }
  }

  @ReactMethod
  override fun createToken(
    params: ReadableMap,
    promise: Promise,
  ) {
    val type = getValOr(params, "type", null)
    if (type == null) {
      promise.resolve(
        createError(
          CreateTokenErrorType.Failed.toString(),
          "type parameter is required",
        ),
      )
      return
    }

    when (type) {
      "BankAccount" -> {
        createTokenFromBankAccount(params, promise)
      }

      "Card" -> {
        createTokenFromCard(params, promise)
      }

      "Pii" -> {
        createTokenFromPii(params, promise)
      }

      else -> {
        promise.resolve(
          createError(
            CreateTokenErrorType.Failed.toString(),
            "$type type is not supported yet",
          ),
        )
      }
    }
  }

  private fun createTokenFromPii(
    params: ReadableMap,
    promise: Promise,
  ) {
    getValOr(params, "personalId", null)?.let {
      CoroutineScope(Dispatchers.IO).launch {
        runCatching {
          val token = stripe.createPiiTokenSynchronous(it, null, stripeAccountId)
          promise.resolve(createResult("token", mapFromToken(token)))
        }.onFailure {
          promise.resolve(createError(CreateTokenErrorType.Failed.toString(), it.message))
        }
      }
    } ?: run {
      promise.resolve(
        createError(
          CreateTokenErrorType.Failed.toString(),
          "personalId parameter is required",
        ),
      )
    }
  }

  private fun createTokenFromBankAccount(
    params: ReadableMap,
    promise: Promise,
  ) {
    val accountHolderName = getValOr(params, "accountHolderName", null)
    val accountHolderType = getValOr(params, "accountHolderType", null)
    val accountNumber = getValOr(params, "accountNumber", null)
    val country = getValOr(params, "country", null)
    val currency = getValOr(params, "currency", null)
    val routingNumber = getValOr(params, "routingNumber", null)

    val bankAccountParams =
      BankAccountTokenParams(
        country = country!!,
        currency = currency!!,
        accountNumber = accountNumber!!,
        accountHolderName = accountHolderName,
        routingNumber = routingNumber,
        accountHolderType = mapToBankAccountType(accountHolderType),
      )
    CoroutineScope(Dispatchers.IO).launch {
      runCatching {
        val token =
          stripe.createBankAccountTokenSynchronous(bankAccountParams, null, stripeAccountId)
        promise.resolve(createResult("token", mapFromToken(token)))
      }.onFailure {
        promise.resolve(createError(CreateTokenErrorType.Failed.toString(), it.message))
      }
    }
  }

  private fun createTokenFromCard(
    params: ReadableMap,
    promise: Promise,
  ) {
    val cardParamsMap =
      (cardFieldView?.cardParams ?: cardFormView?.cardParams)?.toParamMap()
        ?: run {
          promise.resolve(
            createError(
              CreateTokenErrorType.Failed.toString(),
              "Card details not complete",
            ),
          )
          return
        }

    val cardAddress = cardFieldView?.cardAddress ?: cardFormView?.cardAddress
    val address = getMapOrNull(params, "address")
    val cardParams =
      CardParams(
        number = cardParamsMap["number"] as String,
        expMonth = cardParamsMap["exp_month"] as Int,
        expYear = cardParamsMap["exp_year"] as Int,
        cvc = cardParamsMap["cvc"] as String,
        address = mapToAddress(address, cardAddress),
        name = getValOr(params, "name", null),
        currency = getValOr(params, "currency", null),
      )

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val token =
          stripe.createCardTokenSynchronous(
            cardParams = cardParams,
            stripeAccountId = stripeAccountId,
          )
        promise.resolve(createResult("token", mapFromToken(token)))
      } catch (e: Exception) {
        promise.resolve(createError(CreateTokenErrorType.Failed.toString(), e.message))
      }
    }
  }

  @ReactMethod
  override fun createTokenForCVCUpdate(
    cvc: String,
    promise: Promise,
  ) {
    stripe.createCvcUpdateToken(
      cvc,
      callback =
        object : ApiResultCallback<Token> {
          override fun onSuccess(result: Token) {
            val tokenId = result.id
            val res = WritableNativeMap()
            res.putString("tokenId", tokenId)
            promise.resolve(res)
          }

          override fun onError(e: Exception) {
            promise.resolve(createError("Failed", e))
          }
        },
    )
  }

  @ReactMethod
  override fun handleNextAction(
    paymentIntentClientSecret: String,
    returnUrl: String?,
    promise: Promise,
  ) {
    paymentLauncherFragment =
      PaymentLauncherFragment.forNextActionPayment(
        context = reactApplicationContext,
        stripe,
        publishableKey,
        stripeAccountId,
        promise,
        paymentIntentClientSecret,
      )
  }

  @ReactMethod
  override fun handleNextActionForSetup(
    setupIntentClientSecret: String,
    returnUrl: String?,
    promise: Promise,
  ) {
    paymentLauncherFragment =
      PaymentLauncherFragment.forNextActionSetup(
        context = reactApplicationContext,
        stripe,
        publishableKey,
        stripeAccountId,
        promise,
        setupIntentClientSecret,
      )
  }

// TODO: Uncomment when WeChat is re-enabled in stripe-ios
//  private fun payWithWeChatPay(paymentIntentClientSecret: String, appId: String) {
//    val activity = currentActivity as ComponentActivity
//
//    activity.lifecycleScope.launch {
//      stripe.createPaymentMethod(PaymentMethodCreateParams.createWeChatPay()).id?.let { paymentMethodId ->
//        val confirmPaymentIntentParams =
//          ConfirmPaymentIntentParams.createWithPaymentMethodId(
//            paymentMethodId = paymentMethodId,
//            clientSecret = paymentIntentClientSecret,
//            paymentMethodOptions = PaymentMethodOptionsParams.WeChatPay(
//              appId
//            )
//          )
//        paymentLauncherFragment.paymentLauncher.confirm(confirmPaymentIntentParams)
//      }
//    }
//  }

  @ReactMethod
  override fun confirmPayment(
    paymentIntentClientSecret: String,
    params: ReadableMap?,
    options: ReadableMap?,
    promise: Promise,
  ) {
    val paymentMethodData = getMapOrNull(params, "paymentMethodData")
    val paymentMethodType =
      if (params != null) {
        mapToPaymentMethodType(params.getString("paymentMethodType")) ?: run {
          promise.resolve(
            createError(
              ConfirmPaymentErrorType.Failed.toString(),
              "You must provide paymentMethodType",
            ),
          )
          return
        }
      } else {
        null // Expect that payment method was attached on the server
      }

//    if (paymentMethodType == PaymentMethod.Type.WeChatPay) {
//      val appId = getValOr(params, "appId") ?: run {
//        promise.resolve(createError("Failed", "You must provide appId"))
//        return
//      }
//      payWithWeChatPay(paymentIntentClientSecret, appId, promise)
//
//      return
//    }

    val factory =
      PaymentMethodCreateParamsFactory(paymentMethodData, options, cardFieldView, cardFormView)

    try {
      val confirmParams =
        factory.createParams(
          paymentIntentClientSecret,
          paymentMethodType,
          isPaymentIntent = true,
        ) as ConfirmPaymentIntentParams
      urlScheme?.let {
        confirmParams.returnUrl = mapToReturnURL(urlScheme)
      }
      confirmParams.shipping =
        mapToShippingDetails(getMapOrNull(paymentMethodData, "shippingDetails"))
      paymentLauncherFragment =
        PaymentLauncherFragment.forPayment(
          context = reactApplicationContext,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          paymentIntentClientSecret,
          confirmParams,
        )
    } catch (error: PaymentMethodCreateParamsException) {
      promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), error))
    }
  }

  @ReactMethod
  override fun retrievePaymentIntent(
    clientSecret: String,
    promise: Promise,
  ) {
    CoroutineScope(Dispatchers.IO).launch {
      val paymentIntent = stripe.retrievePaymentIntentSynchronous(clientSecret)
      promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(paymentIntent)))
    }
  }

  @ReactMethod
  override fun retrieveSetupIntent(
    clientSecret: String,
    promise: Promise,
  ) {
    CoroutineScope(Dispatchers.IO).launch {
      val setupIntent = stripe.retrieveSetupIntentSynchronous(clientSecret)
      promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(setupIntent)))
    }
  }

  @ReactMethod
  override fun confirmSetupIntent(
    setupIntentClientSecret: String,
    params: ReadableMap,
    options: ReadableMap,
    promise: Promise,
  ) {
    val paymentMethodType =
      getValOr(params, "paymentMethodType")?.let { mapToPaymentMethodType(it) } ?: run {
        promise.resolve(
          createError(
            ConfirmPaymentErrorType.Failed.toString(),
            "You must provide paymentMethodType",
          ),
        )
        return
      }

    val factory =
      PaymentMethodCreateParamsFactory(
        getMapOrNull(params, "paymentMethodData"),
        options,
        cardFieldView,
        cardFormView,
      )

    try {
      val confirmParams =
        factory.createParams(
          setupIntentClientSecret,
          paymentMethodType,
          isPaymentIntent = false,
        ) as ConfirmSetupIntentParams
      urlScheme?.let {
        confirmParams.returnUrl = mapToReturnURL(urlScheme)
      }
      paymentLauncherFragment =
        PaymentLauncherFragment.forSetup(
          context = reactApplicationContext,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          setupIntentClientSecret,
          confirmParams,
        )
    } catch (error: PaymentMethodCreateParamsException) {
      promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), error))
    }
  }

  @ReactMethod
  override fun isPlatformPaySupported(
    params: ReadableMap?,
    promise: Promise,
  ) {
    val googlePayParams = params?.getMap("googlePay")
    val fragment =
      GooglePayPaymentMethodLauncherFragment.create(
        reactApplicationContext,
        getBooleanOrFalse(googlePayParams, "testEnv"),
        getBooleanOrFalse(googlePayParams, "existingPaymentMethodRequired"),
        promise,
      )

    getCurrentActivityOrResolveWithError(promise)?.let {
      try {
        it.supportFragmentManager
          .beginTransaction()
          .add(fragment, GooglePayPaymentMethodLauncherFragment.TAG)
          .commit()
      } catch (error: IllegalStateException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error.message))
      }
    }
  }

  @ReactMethod
  override fun confirmPlatformPay(
    clientSecret: String,
    params: ReadableMap,
    isPaymentIntent: Boolean,
    promise: Promise,
  ) {
    if (!::stripe.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }

    val googlePayParams: ReadableMap =
      params.getMap("googlePay") ?: run {
        promise.resolve(
          createError(
            GooglePayErrorType.Failed.toString(),
            "You must provide the `googlePay` parameter.",
          ),
        )
        return
      }

    GooglePayLauncherFragment().also {
      it.presentGooglePaySheet(
        clientSecret,
        if (isPaymentIntent) GooglePayLauncherFragment.Mode.ForPayment else GooglePayLauncherFragment.Mode.ForSetup,
        googlePayParams,
        reactApplicationContext,
      ) { launcherResult, errorMap ->
        if (errorMap != null) {
          promise.resolve(errorMap)
        } else if (launcherResult != null) {
          when (launcherResult) {
            GooglePayLauncher.Result.Completed -> {
              if (isPaymentIntent) {
                stripe.retrievePaymentIntent(
                  clientSecret,
                  stripeAccountId,
                  expand = listOf("payment_method"),
                  object : ApiResultCallback<PaymentIntent> {
                    override fun onError(e: Exception) {
                      promise.resolve(createResult("paymentIntent", WritableNativeMap()))
                    }

                    override fun onSuccess(result: PaymentIntent) {
                      promise.resolve(
                        createResult(
                          "paymentIntent",
                          mapFromPaymentIntentResult(result),
                        ),
                      )
                    }
                  },
                )
              } else {
                stripe.retrieveSetupIntent(
                  clientSecret,
                  stripeAccountId,
                  expand = listOf("payment_method"),
                  object : ApiResultCallback<SetupIntent> {
                    override fun onError(e: Exception) {
                      promise.resolve(createResult("setupIntent", WritableNativeMap()))
                    }

                    override fun onSuccess(result: SetupIntent) {
                      promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
                    }
                  },
                )
              }
            }

            GooglePayLauncher.Result.Canceled -> {
              promise.resolve(
                createError(
                  GooglePayErrorType.Canceled.toString(),
                  "Google Pay has been canceled",
                ),
              )
            }

            is GooglePayLauncher.Result.Failed -> {
              promise.resolve(
                createError(
                  GooglePayErrorType.Failed.toString(),
                  launcherResult.error,
                ),
              )
            }
          }
        }
      }
    }
  }

  @ReactMethod
  override fun createPlatformPayPaymentMethod(
    params: ReadableMap,
    usesDeprecatedTokenFlow: Boolean,
    promise: Promise,
  ) {
    val googlePayParams: ReadableMap =
      params.getMap("googlePay") ?: run {
        promise.resolve(
          createError(
            GooglePayErrorType.Failed.toString(),
            "You must provide the `googlePay` parameter.",
          ),
        )
        return
      }
    platformPayUsesDeprecatedTokenFlow = usesDeprecatedTokenFlow
    createPlatformPayPaymentMethodPromise = promise
    getCurrentActivityOrResolveWithError(promise)?.let {
      val request =
        GooglePayRequestHelper.createPaymentRequest(
          it,
          GooglePayJsonFactory(reactApplicationContext),
          googlePayParams,
        )
      GooglePayRequestHelper.createPaymentMethod(request, it)
    }
  }

  @ReactMethod
  override fun canAddCardToWallet(
    params: ReadableMap,
    promise: Promise,
  ) {
    val last4 =
      getValOr(params, "cardLastFour", null) ?: run {
        promise.resolve(createError("Failed", "You must provide cardLastFour"))
        return
      }

    if (params.getBooleanOr("supportsTapToPay", true) &&
      !PushProvisioningProxy.isNFCEnabled(
        reactApplicationContext,
      )
    ) {
      promise.resolve(createCanAddCardResult(false, "UNSUPPORTED_DEVICE"))
      return
    }

    getCurrentActivityOrResolveWithError(promise)?.let {
      PushProvisioningProxy.isCardInWallet(it, last4) { isCardInWallet, token, error ->
        val result =
          error?.let {
            createCanAddCardResult(false, "MISSING_CONFIGURATION", null)
          } ?: run {
            val status = if (isCardInWallet) "CARD_ALREADY_EXISTS" else null
            createCanAddCardResult(!isCardInWallet, status, token)
          }
        promise.resolve(result)
      }
    }
  }

  @ReactMethod
  override fun isCardInWallet(
    params: ReadableMap,
    promise: Promise,
  ) {
    val last4 =
      getValOr(params, "cardLastFour", null) ?: run {
        promise.resolve(createError("Failed", "You must provide cardLastFour"))
        return
      }
    getCurrentActivityOrResolveWithError(promise)?.let {
      PushProvisioningProxy.isCardInWallet(it, last4) { isCardInWallet, token, error ->
        val result: WritableMap =
          error ?: run {
            val map = WritableNativeMap()
            map.putBoolean("isInWallet", isCardInWallet)
            map.putMap("token", token)
            map
          }
        promise.resolve(result)
      }
    }
  }

  @ReactMethod
  override fun collectBankAccount(
    isPaymentIntent: Boolean,
    clientSecret: String,
    params: ReadableMap,
    promise: Promise,
  ) {
    val paymentMethodData = getMapOrNull(params, "paymentMethodData")
    val paymentMethodType = mapToPaymentMethodType(getValOr(params, "paymentMethodType", null))
    if (paymentMethodType != PaymentMethod.Type.USBankAccount) {
      promise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "collectBankAccount currently only accepts the USBankAccount payment method type.",
        ),
      )
      return
    }

    val billingDetails = getMapOrNull(paymentMethodData, "billingDetails")

    val name = billingDetails?.getString("name")
    if (name.isNullOrEmpty()) {
      promise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "You must provide a name when collecting US bank account details.",
        ),
      )
      return
    }

    val collectParams =
      CollectBankAccountConfiguration.USBankAccount(
        name,
        billingDetails.getString("email"),
      )

    collectBankAccountLauncherFragment =
      CollectBankAccountLauncherFragment.create(
        reactApplicationContext,
        publishableKey,
        stripeAccountId,
        clientSecret,
        isPaymentIntent,
        collectParams,
        promise,
      )
    getCurrentActivityOrResolveWithError(promise)?.let {
      try {
        it.supportFragmentManager
          .beginTransaction()
          .add(collectBankAccountLauncherFragment!!, "collect_bank_account_launcher_fragment")
          .commit()
      } catch (error: IllegalStateException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error.message))
      }
    }
  }

  @ReactMethod
  override fun verifyMicrodeposits(
    isPaymentIntent: Boolean,
    clientSecret: String,
    params: ReadableMap,
    promise: Promise,
  ) {
    val amounts = params.getArray("amounts")
    val descriptorCode = params.getString("descriptorCode")

    if ((amounts != null && descriptorCode != null) || (amounts == null && descriptorCode == null)) {
      promise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "You must provide either amounts OR descriptorCode, not both.",
        ),
      )
      return
    }

    val paymentCallback =
      object : ApiResultCallback<PaymentIntent> {
        override fun onError(e: Exception) {
          promise.resolve(createError(ErrorType.Failed.toString(), e))
        }

        override fun onSuccess(result: PaymentIntent) {
          promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(result)))
        }
      }

    val setupCallback =
      object : ApiResultCallback<SetupIntent> {
        override fun onError(e: Exception) {
          promise.resolve(createError(ErrorType.Failed.toString(), e))
        }

        override fun onSuccess(result: SetupIntent) {
          promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
        }
      }

    amounts?.let {
      if (it.size() != 2) {
        promise.resolve(
          createError(
            ErrorType.Failed.toString(),
            "Expected 2 integers in the amounts array, but received ${it.size()}",
          ),
        )
        return
      }

      if (isPaymentIntent) {
        stripe.verifyPaymentIntentWithMicrodeposits(
          clientSecret,
          it.getInt(0),
          it.getInt(1),
          paymentCallback,
        )
      } else {
        stripe.verifySetupIntentWithMicrodeposits(
          clientSecret,
          it.getInt(0),
          it.getInt(1),
          setupCallback,
        )
      }
    } ?: descriptorCode?.let {
      if (isPaymentIntent) {
        stripe.verifyPaymentIntentWithMicrodeposits(
          clientSecret,
          it,
          paymentCallback,
        )
      } else {
        stripe.verifySetupIntentWithMicrodeposits(
          clientSecret,
          it,
          setupCallback,
        )
      }
    }
  }

  @ReactMethod
  override fun collectBankAccountToken(
    clientSecret: String,
    params: ReadableMap,
    promise: Promise,
  ) {
    if (!::stripe.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }
    FinancialConnectionsSheetFragment().also {
      it.presentFinancialConnectionsSheet(
        clientSecret,
        FinancialConnectionsSheetFragment.Mode.ForToken,
        publishableKey,
        stripeAccountId,
        promise,
        reactApplicationContext,
      )
    }
  }

  @ReactMethod
  override fun collectFinancialConnectionsAccounts(
    clientSecret: String,
    params: ReadableMap,
    promise: Promise,
  ) {
    if (!::stripe.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }
    FinancialConnectionsSheetFragment().also {
      it.presentFinancialConnectionsSheet(
        clientSecret,
        FinancialConnectionsSheetFragment.Mode.ForSession,
        publishableKey,
        stripeAccountId,
        promise,
        reactApplicationContext,
      )
    }
  }

  @ReactMethod
  override fun initCustomerSheet(
    params: ReadableMap,
    customerAdapterOverrides: ReadableMap,
    promise: Promise,
  ) {
    if (!::stripe.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }

    getCurrentActivityOrResolveWithError(promise)?.let { activity ->
      customerSheetFragment?.removeFragment(reactApplicationContext)
      customerSheetFragment =
        CustomerSheetFragment().also {
          it.context = reactApplicationContext
          it.initPromise = promise
          val bundle = toBundleObject(params)
          bundle.putBundle("customerAdapter", toBundleObject(customerAdapterOverrides))
          it.arguments = bundle
        }
      try {
        activity.supportFragmentManager
          .beginTransaction()
          .add(customerSheetFragment!!, CustomerSheetFragment.TAG)
          .commit()
      } catch (error: IllegalStateException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error.message))
      }
    }
  }

  @ReactMethod
  override fun presentCustomerSheet(
    params: ReadableMap,
    promise: Promise,
  ) {
    var timeout: Long? = null
    if (params.hasKey("timeout")) {
      timeout = params.getInt("timeout").toLong()
    }
    customerSheetFragment?.present(timeout, promise) ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
    }
  }

  @ReactMethod
  override fun retrieveCustomerSheetPaymentOptionSelection(promise: Promise) {
    customerSheetFragment?.retrievePaymentOptionSelection(promise) ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
    }
  }

  @ReactMethod
  override fun customerAdapterFetchPaymentMethodsCallback(
    paymentMethodJsonObjects: ReadableArray,
    promise: Promise,
  ) {
    customerSheetFragment?.let { fragment ->
      val paymentMethods = mutableListOf<PaymentMethod>()
      for (paymentMethodJson in paymentMethodJsonObjects.toArrayList()) {
        PaymentMethod.fromJson(JSONObject((paymentMethodJson as HashMap<*, *>)))?.let {
          paymentMethods.add(it)
        } ?: run {
          Log.e(
            "StripeReactNative",
            "There was an error converting Payment Method JSON to a Stripe Payment Method",
          )
        }
      }
      fragment.customerAdapter?.fetchPaymentMethodsCallback?.complete(paymentMethods)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterAttachPaymentMethodCallback(
    paymentMethodJson: ReadableMap,
    promise: Promise,
  ) {
    customerSheetFragment?.let {
      val paymentMethod =
        PaymentMethod.fromJson(JSONObject(paymentMethodJson.toHashMap() as HashMap<*, *>))
      if (paymentMethod == null) {
        Log.e(
          "StripeReactNative",
          "There was an error converting Payment Method JSON to a Stripe Payment Method",
        )
        return
      }
      it.customerAdapter?.attachPaymentMethodCallback?.complete(paymentMethod)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterDetachPaymentMethodCallback(
    paymentMethodJson: ReadableMap,
    promise: Promise,
  ) {
    customerSheetFragment?.let {
      val paymentMethod =
        PaymentMethod.fromJson(JSONObject(paymentMethodJson.toHashMap() as HashMap<*, *>))
      if (paymentMethod == null) {
        Log.e(
          "StripeReactNative",
          "There was an error converting Payment Method JSON to a Stripe Payment Method",
        )
        return
      }
      it.customerAdapter?.detachPaymentMethodCallback?.complete(paymentMethod)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterSetSelectedPaymentOptionCallback(promise: Promise) {
    customerSheetFragment?.let {
      it.customerAdapter?.setSelectedPaymentOptionCallback?.complete(Unit)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterFetchSelectedPaymentOptionCallback(
    paymentOption: String?,
    promise: Promise,
  ) {
    customerSheetFragment?.let {
      it.customerAdapter?.fetchSelectedPaymentOptionCallback?.complete(paymentOption)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
    clientSecret: String,
    promise: Promise,
  ) {
    customerSheetFragment?.let {
      it.customerAdapter?.setupIntentClientSecretForCustomerAttachCallback?.complete(clientSecret)
    } ?: run {
      promise.resolve(CustomerSheetFragment.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun createEmbeddedPaymentElement(
    intentConfig: ReadableMap,
    configuration: ReadableMap,
    promise: Promise,
  ) {
    // TODO:
  }

  @ReactMethod
  override fun confirmEmbeddedPaymentElement(
    viewTag: Double,
    promise: Promise,
  ) {
    // noop, iOS only
  }

  @ReactMethod
  override fun updateEmbeddedPaymentElement(
    intentConfig: ReadableMap,
    promise: Promise,
  ) {
    // TODO:
  }

  @ReactMethod
  override fun clearEmbeddedPaymentOption(
    viewTag: Double,
    promise: Promise,
  ) {
    // noop, iOS only
  }

  override fun handleURLCallback(
    url: String,
    promise: Promise,
  ) {
    // noop, iOS only.
  }

  override fun openApplePaySetup(promise: Promise) {
    // noop, iOS only.
  }

  override fun configureOrderTracking(
    orderTypeIdentifier: String,
    orderIdentifier: String,
    webServiceUrl: String,
    authenticationToken: String,
    promise: Promise,
  ) {
    // noop, iOS only.
  }

  override fun dismissPlatformPay(promise: Promise?) {
    // noop, iOS only.
  }

  override fun updatePlatformPaySheet(
    summaryItems: ReadableArray?,
    shippingMethods: ReadableArray?,
    errors: ReadableArray?,
    promise: Promise?,
  ) {
    // noop, iOS only.
  }

  /**
   * Safely get and cast the current activity as an AppCompatActivity. If that fails, the promise
   * provided will be resolved with an error message instructing the user to retry the method.
   */
  private fun getCurrentActivityOrResolveWithError(promise: Promise?): FragmentActivity? {
    (currentActivity as? FragmentActivity)?.let {
      return it
    }
    promise?.resolve(createMissingActivityError())
    return null
  }

  private var isRecreatingActivities = false
  private val activityLifecycleCallbacks =
    object : Application.ActivityLifecycleCallbacks {
      override fun onActivityCreated(
        activity: Activity,
        bundle: Bundle?,
      ) {
        if (bundle != null) {
          isRecreatingActivities = true
        }
        if (isRecreatingActivities && activity.javaClass.name.startsWith("com.stripe.android")) {
          activity.finish()
        }
      }

      override fun onActivityStarted(activity: Activity) {
      }

      override fun onActivityResumed(activity: Activity) {
        isRecreatingActivities = false
      }

      override fun onActivityPaused(activity: Activity) {
      }

      override fun onActivityStopped(activity: Activity) {
      }

      override fun onActivitySaveInstanceState(
        activity: Activity,
        bundle: Bundle,
      ) {
      }

      override fun onActivityDestroyed(activity: Activity) {
      }
    }

  /**
   * React native apps do not properly handle activity re-creation so make
   * sure to dismiss any stripe ui when that happens to make sure apps stay
   * in a consistent state.
   *
   * Note that because of some restrictions on some system ui like google
   * pay this might not always work.
   */
  private fun preventActivityRecreation() {
    currentActivity?.application?.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)
  }

  private fun setupComposeCompatView() {
    UiThreadUtil.runOnUiThread {
      composeCompatView = composeCompatView ?: StripeAbstractComposeView.CompatView(context = reactApplicationContext).also {
        currentActivity?.findViewById<ViewGroup>(android.R.id.content)?.addView(
          it,
        )
      }
    }
  }

  companion object {
    const val NAME = NativeStripeSdkModuleSpec.NAME
  }
}
