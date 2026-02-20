package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import androidx.fragment.app.FragmentActivity
import com.facebook.react.ReactActivity
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
import com.reactnativestripesdk.addresssheet.AddressLauncherManager
import com.reactnativestripesdk.customersheet.CustomerSheetManager
import com.reactnativestripesdk.pushprovisioning.PushProvisioningProxy
import com.reactnativestripesdk.utils.ConfirmPaymentErrorType
import com.reactnativestripesdk.utils.CreateTokenErrorType
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.GooglePayErrorType
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createCanAddCardResult
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createMissingInitError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntOrNull
import com.reactnativestripesdk.utils.getLongOrNull
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
import com.stripe.android.ApiResultCallback
import com.stripe.android.GooglePayJsonFactory
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.core.ApiVersion
import com.stripe.android.core.AppInfo
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.customersheet.CustomerSheet
import com.stripe.android.googlepaylauncher.GooglePayLauncher
import com.stripe.android.model.BankAccountTokenParams
import com.stripe.android.model.CardParams
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.RadarSession
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
@OptIn(ReactNativeSdkInternal::class)
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

  private val stripeUIManagers = mutableListOf<StripeUIManager>()
  private var paymentSheetManager: PaymentSheetManager? = null
  private var paymentLauncherManager: PaymentLauncherManager? = null
  private var collectBankAccountLauncherManager: CollectBankAccountLauncherManager? = null
  private var financialConnectionsSheetManager: FinancialConnectionsSheetManager? = null
  private var googlePayLauncherManager: GooglePayLauncherManager? = null
  private var googlePayPaymentMethodLauncherManager: GooglePayPaymentMethodLauncherManager? = null

  private var customerSheetManager: CustomerSheetManager? = null

  internal var embeddedIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var embeddedConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()
  internal var customPaymentMethodResultCallback = CompletableDeferred<ReadableMap>()
  internal var paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()

  internal var composeCompatView: StripeAbstractComposeView.CompatView? = null

  // Storage for pending stripe-connect:// deep link URLs to prevent Expo Router from receiving them
  private val pendingStripeConnectUrls = mutableListOf<String>()
  private val pendingUrlsLock = Any()

  val eventEmitter: EventEmitterCompat by lazy { EventEmitterCompat(reactApplicationContext) }

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
              }
            }
          }
        }
      }
    }

  init {
    reactContext.addActivityEventListener(mActivityEventListener)
  }

  override fun invalidate() {
    super.invalidate()

    stripeUIManagers.forEach { it.destroy() }
    stripeUIManagers.clear()
  }

  private fun registerStripeUIManager(uiManager: StripeUIManager) {
    uiManager.create()
    stripeUIManagers.add(uiManager)
  }

  private fun unregisterStripeUIManager(uiManager: StripeUIManager?) {
    val uiManager = uiManager ?: return
    uiManager.destroy()
    stripeUIManagers.remove(uiManager)
  }

  private fun configure3dSecure(params: ReadableMap) {
    val stripe3dsConfigBuilder = PaymentAuthConfig.Stripe3ds2Config.Builder()
    params.getIntOrNull("timeout")?.let { stripe3dsConfigBuilder.setTimeout(it) }
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
  override fun getTypedExportedConstants(): Map<String, Any> {
    val packageInfo =
      try {
        reactApplicationContext.packageManager.getPackageInfo(
          reactApplicationContext.packageName,
          0,
        )
      } catch (e: Exception) {
        null
      }

    return mapOf(
      "API_VERSIONS" to
        mapOf(
          "CORE" to ApiVersion.API_VERSION_CODE,
          "ISSUING" to PushProvisioningProxy.getApiVersion(),
        ),
      "SYSTEM_INFO" to
        mapOf(
          "sdkVersion" to STRIPE_ANDROID_SDK_VERSION,
          "osVersion" to android.os.Build.VERSION.RELEASE,
          "deviceType" to "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
          "appName" to (
            reactApplicationContext.applicationInfo
              .loadLabel(
                reactApplicationContext.packageManager,
              ).toString()
          ),
          "appVersion" to (packageInfo?.versionName ?: ""),
        ),
    )
  }

  @ReactMethod
  override fun initialise(
    params: ReadableMap,
    promise: Promise,
  ) {
    val publishableKey = getValOr(params, "publishableKey", null) as String
    val appInfo = params.getMap("appInfo") as ReadableMap
    this.stripeAccountId = getValOr(params, "stripeAccountId", null)
    val urlScheme = getValOr(params, "urlScheme", null)
    val setReturnUrlSchemeOnAndroid = params.getBooleanOr("setReturnUrlSchemeOnAndroid", false)
    this.urlScheme = if (setReturnUrlSchemeOnAndroid) urlScheme else null

    params.getMap("threeDSecureParams")?.let {
      configure3dSecure(it)
    }

    this.publishableKey = publishableKey
    AddressLauncherManager.publishableKey = publishableKey

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
    unregisterStripeUIManager(paymentSheetManager)
    paymentSheetManager =
      PaymentSheetManager(reactApplicationContext, params, promise).also {
        registerStripeUIManager(it)
      }
  }

  @ReactMethod
  override fun presentPaymentSheet(
    options: ReadableMap,
    promise: Promise,
  ) {
    if (paymentSheetManager == null) {
      promise.resolve(PaymentSheetManager.createMissingInitError())
      return
    }

    val timeout = options.getLongOrNull("timeout")
    if (timeout != null) {
      paymentSheetManager?.presentWithTimeout(
        timeout,
        promise,
      )
    } else {
      paymentSheetManager?.present(promise)
    }
  }

  @ReactMethod
  override fun confirmPaymentSheetPayment(promise: Promise) {
    if (paymentSheetManager == null) {
      promise.resolve(PaymentSheetManager.createMissingInitError())
      return
    }

    paymentSheetManager?.confirmPayment(promise)
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

    if (paymentSheetManager == null) {
      promise.resolve(PaymentSheetManager.createMissingInitError())
      return
    }

    paymentSheetManager?.paymentSheetIntentCreationCallback?.complete(params)
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
  override fun confirmationTokenCreationCallback(
    params: ReadableMap,
    promise: Promise,
  ) {
    embeddedConfirmationTokenCreationCallback.complete(params)
    paymentSheetConfirmationTokenCreationCallback.complete(params)

    if (paymentSheetManager == null) {
      promise.resolve(PaymentSheetManager.createMissingInitError())
      return
    }

    paymentSheetManager?.paymentSheetConfirmationTokenCreationCallback?.complete(params)
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
    val paymentMethodData = data.getMap("paymentMethodData")
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

      "Account" -> {
        createTokenFromAccount(params, promise)
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

  private fun createTokenFromAccount(params: ReadableMap, promise: Promise) {
    val businessType = getValOr(params, "businessType", null)
    if (businessType != "Individual") {
      promise.resolve(createError(CreateTokenErrorType.Failed.toString(), "businessType currently only accepts the Individual account type"))
      return
    }

    val individualData = params.getMap("individual")
    val accountParams = AccountParams.create(
      tosShownAndAccepted = params.getBooleanOr("tosShownAndAccepted", false),
      individual = AccountParams.BusinessTypeParams.Individual(
        email = getValOr(individualData, "email", null),
        phone = getValOr(individualData, "phone", null)
      )
    )
    CoroutineScope(Dispatchers.IO).launch {
      runCatching {
        val token = stripe.createAccountToken(accountParams, null, stripeAccountId)
        promise.resolve(createResult("token", mapFromToken(token)))
      }.onFailure {
        promise.resolve(createError(CreateTokenErrorType.Failed.toString(), it.message))
      }
    }
  }

  private fun createTokenFromPii(params: ReadableMap, promise: Promise) {
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
    val address = params.getMap("address")
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
            val res = Arguments.createMap()
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
    unregisterStripeUIManager(paymentSheetManager)
    paymentLauncherManager =
      PaymentLauncherManager
        .forNextActionPayment(
          context = reactApplicationContext,
          stripe,
          publishableKey,
          stripeAccountId,
          paymentIntentClientSecret,
        ).also {
          registerStripeUIManager(it)
          it.present(promise)
        }
  }

  @ReactMethod
  override fun handleNextActionForSetup(
    setupIntentClientSecret: String,
    returnUrl: String?,
    promise: Promise,
  ) {
    unregisterStripeUIManager(paymentLauncherManager)
    paymentLauncherManager =
      PaymentLauncherManager
        .forNextActionSetup(
          context = reactApplicationContext,
          stripe,
          publishableKey,
          stripeAccountId,
          setupIntentClientSecret,
        ).also {
          registerStripeUIManager(it)
          it.present(promise)
        }
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
    val paymentMethodData = params?.getMap("paymentMethodData")
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
        mapToShippingDetails(paymentMethodData?.getMap("shippingDetails"))
      unregisterStripeUIManager(paymentLauncherManager)
      paymentLauncherManager =
        PaymentLauncherManager
          .forPayment(
            context = reactApplicationContext,
            stripe,
            publishableKey,
            stripeAccountId,
            paymentIntentClientSecret,
            confirmParams,
          ).also {
            registerStripeUIManager(it)
            it.present(promise)
          }
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
        params.getMap("paymentMethodData"),
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
      unregisterStripeUIManager(paymentLauncherManager)
      paymentLauncherManager =
        PaymentLauncherManager
          .forSetup(
            context = reactApplicationContext,
            stripe,
            publishableKey,
            stripeAccountId,
            setupIntentClientSecret,
            confirmParams,
          ).also {
            registerStripeUIManager(it)
            it.present(promise)
          }
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
    unregisterStripeUIManager(googlePayPaymentMethodLauncherManager)
    googlePayPaymentMethodLauncherManager =
      GooglePayPaymentMethodLauncherManager(
        reactApplicationContext,
        googlePayParams?.getBooleanOr("testEnv", false) ?: false,
        googlePayParams?.getBooleanOr("existingPaymentMethodRequired", false) ?: false,
      ).also {
        registerStripeUIManager(it)
        it.present(promise)
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

    unregisterStripeUIManager(googlePayLauncherManager)
    googlePayLauncherManager =
      GooglePayLauncherManager(
        reactApplicationContext,
        clientSecret,
        if (isPaymentIntent) GooglePayLauncherManager.Mode.ForPayment else GooglePayLauncherManager.Mode.ForSetup,
        googlePayParams,
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
                      promise.resolve(createResult("paymentIntent", Arguments.createMap()))
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
                      promise.resolve(createResult("setupIntent", Arguments.createMap()))
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
      }.also {
        registerStripeUIManager(it)
        it.present()
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
            val map = Arguments.createMap()
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
    val paymentMethodData = params.getMap("paymentMethodData")
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

    val billingDetails = paymentMethodData?.getMap("billingDetails")

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

    unregisterStripeUIManager(collectBankAccountLauncherManager)
    collectBankAccountLauncherManager =
      CollectBankAccountLauncherManager(
        reactApplicationContext,
        publishableKey,
        stripeAccountId,
        clientSecret,
        isPaymentIntent,
        collectParams,
      ).also {
        registerStripeUIManager(it)
        it.present(promise)
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

    // Use connectedAccountId from params if provided, otherwise fall back to global stripeAccountId
    val accountId = getValOr(params, "connectedAccountId", null) ?: stripeAccountId

    unregisterStripeUIManager(financialConnectionsSheetManager)
    financialConnectionsSheetManager =
      FinancialConnectionsSheetManager(
        reactApplicationContext,
        clientSecret,
        FinancialConnectionsSheetManager.Mode.ForToken,
        publishableKey,
        accountId,
      ).also {
        registerStripeUIManager(it)
        it.present(promise)
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

    // Use connectedAccountId from params if provided, otherwise fall back to global stripeAccountId
    val accountId = getValOr(params, "connectedAccountId", null) ?: stripeAccountId

    unregisterStripeUIManager(financialConnectionsSheetManager)
    financialConnectionsSheetManager =
      FinancialConnectionsSheetManager(
        reactApplicationContext,
        clientSecret,
        FinancialConnectionsSheetManager.Mode.ForSession,
        publishableKey,
        accountId,
      ).also {
        registerStripeUIManager(it)
        it.present(promise)
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

    unregisterStripeUIManager(customerSheetManager)
    customerSheetManager =
      CustomerSheetManager(reactApplicationContext, params, customerAdapterOverrides, promise).also {
        registerStripeUIManager(it)
      }
  }

  @ReactMethod
  override fun presentCustomerSheet(
    params: ReadableMap,
    promise: Promise,
  ) {
    val timeout = params.getLongOrNull("timeout")
    customerSheetManager?.present(promise, timeout) ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
    }
  }

  @ReactMethod
  override fun retrieveCustomerSheetPaymentOptionSelection(promise: Promise) {
    customerSheetManager?.retrievePaymentOptionSelection(promise) ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
    }
  }

  @ReactMethod
  override fun customerAdapterFetchPaymentMethodsCallback(
    paymentMethodJsonObjects: ReadableArray,
    promise: Promise,
  ) {
    customerSheetManager?.let { fragment ->
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
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterAttachPaymentMethodCallback(
    paymentMethodJson: ReadableMap,
    promise: Promise,
  ) {
    customerSheetManager?.let {
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
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterDetachPaymentMethodCallback(
    paymentMethodJson: ReadableMap,
    promise: Promise,
  ) {
    customerSheetManager?.let {
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
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterSetSelectedPaymentOptionCallback(promise: Promise) {
    customerSheetManager?.let {
      it.customerAdapter?.setSelectedPaymentOptionCallback?.complete(Unit)
    } ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterFetchSelectedPaymentOptionCallback(
    paymentOption: String?,
    promise: Promise,
  ) {
    customerSheetManager?.let {
      it.customerAdapter?.fetchSelectedPaymentOptionCallback?.complete(paymentOption)
    } ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
    clientSecret: String,
    promise: Promise,
  ) {
    customerSheetManager?.let {
      it.customerAdapter?.setupIntentClientSecretForCustomerAttachCallback?.complete(clientSecret)
    } ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun clientSecretProviderSetupIntentClientSecretCallback(
    setupIntentClientSecret: String,
    promise: Promise,
  ) {
    customerSheetManager?.let {
      it.customerSessionProvider?.provideSetupIntentClientSecretCallback?.complete(setupIntentClientSecret)
    } ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun clientSecretProviderCustomerSessionClientSecretCallback(
    customerSessionClientSecretJson: ReadableMap,
    promise: Promise,
  ) {
    val clientSecret = customerSessionClientSecretJson.getString("clientSecret")
    val customerId = customerSessionClientSecretJson.getString("customerId")

    if (clientSecret.isNullOrEmpty() || customerId.isNullOrEmpty()) {
      Log.e(
        "StripeReactNative",
        "Invalid CustomerSessionClientSecret format",
      )
      return
    }

    customerSheetManager?.let {
      it.customerSessionProvider?.providesCustomerSessionClientSecretCallback?.complete(
        CustomerSheet.CustomerSessionClientSecret.create(
          customerId = customerId,
          clientSecret = clientSecret,
        ),
      )
    } ?: run {
      promise.resolve(CustomerSheetManager.createMissingInitError())
      return
    }
  }

  @ReactMethod
  override fun createRadarSession(promise: Promise) {
    if (!::stripe.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }

    stripe.createRadarSession(
      stripeAccountId = stripeAccountId,
      callback =
        object : com.stripe.android.ApiResultCallback<RadarSession> {
          override fun onSuccess(session: RadarSession) {
            val result = WritableNativeMap()
            result.putString("id", session.id)
            promise.resolve(result)
          }

          override fun onError(e: Exception) {
            promise.resolve(createError(ErrorType.Failed.toString(), e))
          }
        },
      activity = getCurrentActivityOrResolveWithError(promise) as? AppCompatActivity,
    )
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

  @ReactMethod
  override fun setFinancialConnectionsForceNativeFlow(
    enabled: Boolean,
    promise: Promise,
  ) {
    // noop, iOS only
  }

  @ReactMethod
  override fun openAuthenticatedWebView(
    id: String,
    url: String,
    promise: Promise,
  ) {
    isAuthWebViewActive = true
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return

    UiThreadUtil.runOnUiThread {
      try {
        val uri = url.toUri()
        val builder =
          androidx.browser.customtabs.CustomTabsIntent
            .Builder()

        // Set toolbar color for better UX
        builder.setShowTitle(true)
        builder.setUrlBarHidingEnabled(true)

        val customTabsIntent = builder.build()

        // NOTE: We intentionally do NOT use FLAG_ACTIVITY_NO_HISTORY here.
        // That flag can cause React Native's state restoration to fail when returning from Custom Tabs,
        // resulting in the navigation stack being reset and the previous screen being dismissed.
        // Custom Tabs will be properly cleaned up when the user navigates back or the session completes.

        // Note: Custom Tabs doesn't have built-in redirect handling like iOS ASWebAuthenticationSession.
        // The redirect will be handled via deep linking when the auth server redirects to stripe-connect://
        // The React Native Linking module will capture the deep link and pass it back to the JS layer.
        customTabsIntent.launchUrl(activity, uri)

        // Fallback: Reset after timeout if JavaScript doesn't call authWebViewDeepLinkHandled
        Handler(Looper.getMainLooper()).postDelayed({
          if (isAuthWebViewActive) {
            isAuthWebViewActive = false
          }
        }, AUTH_WEBVIEW_FALLBACK_TIMEOUT_MS)

        promise.resolve(null)
      } catch (e: Exception) {
        isAuthWebViewActive = false
        promise.resolve(createError("Failed", e))
      }
    }
  }

  @ReactMethod
  override fun downloadAndShareFile(
    url: String,
    filename: String?,
    promise: Promise,
  ) {
    CoroutineScope(Dispatchers.IO).launch {
      try {
        // Download file
        val client = okhttp3.OkHttpClient()
        val request =
          okhttp3.Request
            .Builder()
            .url(url)
            .build()
        val response = client.newCall(request).execute()

        if (!response.isSuccessful) {
          promise.resolve(
            Arguments.createMap().apply {
              putBoolean("success", false)
              putString("error", "NetworkError")
              putString("message", "HTTP ${response.code}")
            },
          )
          return@launch
        }

        // Save to cache directory
        val exportsDir = java.io.File(reactApplicationContext.cacheDir, "stripe-exports")
        exportsDir.mkdirs()

        val file = java.io.File(exportsDir, "export-${java.util.UUID.randomUUID()}.csv")

        response.body?.byteStream()?.use { input ->
          file.outputStream().use { output ->
            input.copyTo(output)
          }
        }

        // Share on main thread
        UiThreadUtil.runOnUiThread {
          shareFile(file, promise)
        }
      } catch (e: Exception) {
        promise.resolve(
          Arguments.createMap().apply {
            putBoolean("success", false)
            putString("error", "DownloadFailed")
            putString("message", e.message ?: "Unknown error")
          },
        )
      }
    }
  }

  private fun shareFile(
    file: java.io.File,
    promise: Promise,
  ) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      promise.resolve(
        Arguments.createMap().apply {
          putBoolean("success", false)
          putString("error", "NoActivity")
          putString("message", "No activity available")
        },
      )
      return
    }

    try {
      val uri =
        androidx.core.content.FileProvider.getUriForFile(
          reactApplicationContext,
          "${reactApplicationContext.packageName}.stripe.fileprovider",
          file,
        )

      val shareIntent =
        Intent(Intent.ACTION_SEND).apply {
          type = "text/csv"
          putExtra(Intent.EXTRA_STREAM, uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

      val chooser = Intent.createChooser(shareIntent, "Share CSV Export")
      activity.startActivity(chooser)

      // Schedule cleanup
      android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
        file.delete()
      }, 3000)

      promise.resolve(
        Arguments.createMap().apply {
          putBoolean("success", true)
        },
      )
    } catch (e: Exception) {
      promise.resolve(
        Arguments.createMap().apply {
          putBoolean("success", false)
          putString("error", "ShareFailed")
          putString("message", e.message ?: "Unknown error")
        },
      )
    }
  }

  @ReactMethod
  override fun authWebViewDeepLinkHandled(
    id: String,
    promise: Promise,
  ) {
    isAuthWebViewActive = false
    promise.resolve(null)
  }

  /**
   * Store a stripe-connect:// deep link URL for later retrieval.
   * This prevents the URL from being broadcast to Expo Router.
   */
  @ReactMethod
  override fun storeStripeConnectDeepLink(
    url: String,
    promise: Promise,
  ) {
    synchronized(pendingUrlsLock) {
      pendingStripeConnectUrls.add(url)
    }
    promise.resolve(null)
  }

  /**
   * Poll for pending stripe-connect:// deep link URLs.
   * Returns all pending URLs and clears the queue.
   *
   * URLs are captured by StripeConnectDeepLinkInterceptor Activity, which prevents
   * Expo Router from receiving the URLs and dismissing the current screen.
   */
  @ReactMethod
  override fun pollAndClearPendingStripeConnectUrls(promise: Promise) {
    try {
      val urlsArray = Arguments.createArray()

      // Get URLs from SDK's internal storage (set by StripeConnectDeepLinkInterceptor)
      val sdkUrls = retrieveAndClearPendingUrls()
      sdkUrls.forEach { url ->
        urlsArray.pushString(url)
      }

      // Legacy: Support old MainActivity pattern (deprecated, will be removed in future version)
      // This maintains backward compatibility for apps that implemented the manual pattern
      try {
        val mainActivityClass = Class.forName("com.stripe.examplestripeconnect.MainActivity")
        val getPendingUrlsMethod = mainActivityClass.getMethod("getPendingUrls")

        @Suppress("UNCHECKED_CAST")
        val mainActivityUrls = getPendingUrlsMethod.invoke(null) as? List<String>
        if (!mainActivityUrls.isNullOrEmpty()) {
          Log.w(
            TAG,
            "Using deprecated MainActivity.getPendingUrls() pattern. " +
              "This pattern is no longer needed and will be removed in a future version. " +
              "The SDK now handles stripe-connect:// URLs automatically.",
          )
          mainActivityUrls.forEach { url ->
            urlsArray.pushString(url)
          }
        }
      } catch (e: Exception) {
        // Expected when not using deprecated pattern - this is fine
      }

      promise.resolve(urlsArray)
    } catch (e: Exception) {
      Log.e(TAG, "Error polling URLs", e)
      promise.reject("PollError", "Failed to poll pending Stripe Connect URLs: ${e.message}", e)
    }
  }

  override fun addListener(eventType: String?) {
    // noop, iOS only
  }

  override fun removeListeners(count: Double) {
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
    (reactApplicationContext.currentActivity as? FragmentActivity)?.let {
      return it
    }
    promise?.resolve(createMissingActivityError())
    return null
  }

  private var isRecreatingReactActivity = false
  private var isAuthWebViewActive = false
  private val activityLifecycleCallbacks =
    object : Application.ActivityLifecycleCallbacks {
      override fun onActivityCreated(
        activity: Activity,
        bundle: Bundle?,
      ) {
        // Only set flag when ReactActivity is actually being recreated (bundle != null)
        // bundle != null means this is a recreation, not first creation
        if (activity is ReactActivity && bundle != null) {
          isRecreatingReactActivity = true
        }

        // Don't finish Stripe activities during auth webview flow to prevent dismissing the previous screen
        val isStripeActivity = activity.javaClass.name.startsWith("com.stripe.android")
        val shouldFinish = isRecreatingReactActivity && isStripeActivity && !isAuthWebViewActive

        if (shouldFinish) {
          activity.finish()
        }

        // Reset flag after finishing Stripe activities
        if (isRecreatingReactActivity && shouldFinish) {
          Handler(Looper.getMainLooper()).post {
            isRecreatingReactActivity = false
          }
        }
      }

      override fun onActivityStarted(activity: Activity) {}

      override fun onActivityResumed(activity: Activity) {}

      override fun onActivityPaused(activity: Activity) {}

      override fun onActivityStopped(activity: Activity) {}

      override fun onActivitySaveInstanceState(
        activity: Activity,
        bundle: Bundle,
      ) {}

      override fun onActivityDestroyed(activity: Activity) {}
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
    isRecreatingReactActivity = false
    reactApplicationContext.currentActivity?.application?.unregisterActivityLifecycleCallbacks(activityLifecycleCallbacks)
    reactApplicationContext.currentActivity?.application?.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)
  }

  private fun setupComposeCompatView() {
    UiThreadUtil.runOnUiThread {
      composeCompatView = composeCompatView ?: StripeAbstractComposeView.CompatView(context = reactApplicationContext).also {
        reactApplicationContext.currentActivity?.findViewById<ViewGroup>(android.R.id.content)?.addView(
          it,
        )
      }
    }
  }

  companion object {
    const val NAME = NativeStripeSdkModuleSpec.NAME
    private const val TAG = "StripeSdkModule"

    // Read the Stripe Android SDK version from gradle.properties at build time
    private val STRIPE_ANDROID_SDK_VERSION = BuildConfig.STRIPE_ANDROID_SDK_VERSION

    // Timeout for auth webview fallback (if JavaScript doesn't call authWebViewDeepLinkHandled)
    private const val AUTH_WEBVIEW_FALLBACK_TIMEOUT_MS = 60_000L

    // SDK-managed storage for pending stripe-connect:// URLs
    // This is static because deep links can arrive before ReactContext is available
    private val pendingConnectUrls = mutableListOf<String>()
    private val urlsLock = Any()

    /**
     * Store a stripe-connect:// deep link URL.
     * Called automatically by StripeConnectDeepLinkInterceptor.
     * Can also be called manually from MainActivity if users implement custom handling.
     *
     * This method is thread-safe and can be called from any thread.
     *
     * @param url The stripe-connect:// URL to store
     */
    @JvmStatic
    fun storeStripeConnectDeepLink(url: String) {
      synchronized(urlsLock) {
        pendingConnectUrls.add(url)
      }
    }

    /**
     * Retrieve and clear pending URLs.
     * Internal method used by pollAndClearPendingStripeConnectUrls() bridge method.
     *
     * @return List of pending stripe-connect:// URLs
     */
    @JvmStatic
    internal fun retrieveAndClearPendingUrls(): List<String> {
      synchronized(urlsLock) {
        val urls = pendingConnectUrls.toList()
        pendingConnectUrls.clear()
        return urls
      }
    }
  }
}
