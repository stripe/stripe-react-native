@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Application
import androidx.activity.ComponentActivity
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.SavedStateHandle
import com.stripe.android.core.model.CountryCode
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createCanceledError
import com.reactnativestripesdk.utils.createEmptyResult
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createMissingInitError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.getValOr
import com.reactnativestripesdk.utils.mapToPaymentSheetAddress
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.OnrampCoordinator
import com.stripe.android.crypto.onramp.exception.SDKVersion
import com.stripe.android.crypto.onramp.model.CryptoNetwork
import com.stripe.android.crypto.onramp.model.KycInfo
import com.stripe.android.crypto.onramp.model.LinkUserInfo
import com.stripe.android.crypto.onramp.model.OnrampAttachKycInfoResult
import com.stripe.android.crypto.onramp.model.OnrampAuthorizeResult
import com.stripe.android.crypto.onramp.model.OnrampCallbacks
import com.stripe.android.crypto.onramp.model.OnrampCheckoutResult
import com.stripe.android.crypto.onramp.model.OnrampCollectPaymentMethodResult
import com.stripe.android.crypto.onramp.model.OnrampConfigurationResult
import com.stripe.android.crypto.onramp.model.OnrampCreateCryptoPaymentTokenResult
import com.stripe.android.crypto.onramp.model.OnrampUserAttestationResult
import com.stripe.android.crypto.onramp.model.OnrampHasLinkAccountResult
import com.stripe.android.crypto.onramp.model.OnrampLogOutResult
import com.stripe.android.crypto.onramp.model.OnrampRegisterLinkUserResult
import com.stripe.android.crypto.onramp.model.OnrampRegisterWalletAddressResult
import com.stripe.android.crypto.onramp.model.OnrampRetrieveMissingIdentifiersResult
import com.stripe.android.crypto.onramp.model.OnrampSubmitIdentifiersResult
import com.stripe.android.crypto.onramp.model.OnrampTokenAuthenticationResult
import com.stripe.android.crypto.onramp.model.OnrampUpdatePhoneNumberResult
import com.stripe.android.crypto.onramp.model.OnrampVerifyIdentityResult
import com.stripe.android.crypto.onramp.model.OnrampVerifyKycInfoResult
import com.stripe.android.crypto.onramp.model.PaymentMethodSelection
import com.stripe.android.link.LinkController.PaymentMethodPreview
import com.stripe.android.link.PaymentMethodPreviewDetails
import com.stripe.android.model.CardBrand
import com.stripe.android.model.DateOfBirth
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

@SuppressLint("RestrictedApi")
@OptIn(ExperimentalCryptoOnramp::class)
@ReactModule(name = NativeOnrampSdkModuleSpec.NAME)
class OnrampSdkModule(
  reactContext: ReactApplicationContext,
) : NativeOnrampSdkModuleSpec(reactContext) {
  private val eventEmitterCompat = EventEmitterCompat(reactContext)
  private var reactNativeSdkVersion: String? = null
  private lateinit var publishableKey: String
  private var stripeAccountId: String? = null

  private var onrampCoordinator: OnrampCoordinator? = null
  private var onrampPresenter: OnrampCoordinator.Presenter? = null

  private var authenticateUserPromise: Promise? = null
  private var identityVerificationPromise: Promise? = null
  private var collectPaymentPromise: Promise? = null
  private var authorizePromise: Promise? = null
  private var checkoutPromise: Promise? = null
  private var verifyKycPromise: Promise? = null
  private var userAttestationPromise: Promise? = null

  private var checkoutClientSecretDeferred: CompletableDeferred<String>? = null
  private val rnScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  @ReactMethod
  override fun initialise(
    params: ReadableMap,
    promise: Promise,
  ) {
    // Note: This method depends on `StripeSdkModule#initialise()` being called as well.
    val publishableKey = getValOr(params, "publishableKey", null) as String
    reactNativeSdkVersion =
      params.getMap("appInfo")
        ?.getString("version")
        ?.takeIf { it.isNotBlank() }
    this.stripeAccountId = getValOr(params, "stripeAccountId", null)
    this.publishableKey = publishableKey

    promise.resolve(null)
  }

  override fun invalidate() {
    super.invalidate()
    rnScope.cancel()
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

  @ReactMethod
  override fun configureOnramp(
    config: ReadableMap,
    promise: Promise,
  ) {
    if (!::publishableKey.isInitialized) {
      promise.resolve(createMissingInitError())
      return
    }

    val application =
      reactApplicationContext.currentActivity?.application ?: (reactApplicationContext.applicationContext as? Application)
    if (application == null) {
      promise.resolve(createMissingActivityError())
      return
    }

    val onrampCallbacks =
      OnrampCallbacks()
        .verifyIdentityCallback { result ->
          handleOnrampIdentityVerificationResult(result, identityVerificationPromise!!)
        }.collectPaymentCallback { result ->
          handleOnrampCollectPaymentResult(result, collectPaymentPromise!!)
        }.authorizeCallback { result ->
          handleOnrampAuthorizationResult(result, authorizePromise!!)
        }.checkoutCallback { result ->
          handleOnrampCheckoutResult(result, checkoutPromise!!)
        }.verifyKycCallback { result ->
          handleOnrampKycVerificationResult(result, verifyKycPromise!!)
        }.userAttestationCallback { result ->
          userAttestationPromise?.let {
            handleUserAttestationResult(result, it)
          }
        }.onrampSessionClientSecretProvider { sessionId ->
          checkoutClientSecretDeferred = CompletableDeferred()

          val params = Arguments.createMap()
          params.putString("onrampSessionId", sessionId)

          eventEmitterCompat.emitOnCheckoutClientSecretRequested(params)

          checkoutClientSecretDeferred!!.await()
        }

    val coordinator =
      onrampCoordinator ?: OnrampCoordinator
        .Builder()
        .build(application, SavedStateHandle(), onrampCallbacks)
        .also { this.onrampCoordinator = it }

    CoroutineScope(Dispatchers.IO).launch {
      val configuration = mapConfig(config, publishableKey, onrampAdditionalSdkVersions())
      val configureResult = coordinator.configure(configuration)

      CoroutineScope(Dispatchers.Main).launch {
        when (configureResult) {
          is OnrampConfigurationResult.Completed -> {
            createOnrampPresenter(promise)
          }
          is OnrampConfigurationResult.Failed -> {
            promise.resolve(createOnrampFailedError(configureResult.error))
          }
        }
      }
    }
  }

  @ReactMethod
  private fun createOnrampPresenter(promise: Promise) {
    val activity = getCurrentActivityOrResolveWithError(promise) as? ComponentActivity
    if (activity == null) {
      promise.resolve(createMissingActivityError())
      return
    }
    if (onrampCoordinator == null) {
      promise.resolve(createMissingInitError())
      return
    }
    if (onrampPresenter != null) {
      promise.resolveVoid()
      return
    }

    try {
      onrampPresenter = onrampCoordinator!!.createPresenter(activity)
      promise.resolveVoid()
    } catch (e: Exception) {
      promise.resolve(createOnrampFailedError(e))
    }
  }

  @ReactMethod
  override fun hasLinkAccount(
    email: String,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }
    CoroutineScope(Dispatchers.IO).launch {
      when (val result = coordinator.hasLinkAccount(email)) {
        is OnrampHasLinkAccountResult.Completed -> {
          promise.resolveBoolean("hasLinkAccount", result.hasLinkAccount)
        }
        is OnrampHasLinkAccountResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun registerLinkUser(
    info: ReadableMap,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }
    CoroutineScope(Dispatchers.IO).launch {
      val linkUserInfo =
        LinkUserInfo(
          email = info.getString("email") ?: "",
          phone = info.getString("phone") ?: "",
          country = info.getString("country") ?: "",
          fullName = info.getString("fullName"),
        )

      val result = coordinator.registerLinkUser(linkUserInfo)
      when (result) {
        is OnrampRegisterLinkUserResult.Completed -> {
          promise.resolveString("customerId", result.customerId)
        }
        is OnrampRegisterLinkUserResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun registerWalletAddress(
    walletAddress: String,
    network: String,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }
    CoroutineScope(Dispatchers.IO).launch {
      val cryptoNetwork = enumValues<CryptoNetwork>().firstOrNull { it.value == network }
      if (cryptoNetwork == null) {
        promise.resolve(createError(ErrorType.Unknown.toString(), "Invalid network: $network"))
        return@launch
      }

      when (val result = coordinator.registerWalletAddress(walletAddress, cryptoNetwork)) {
        is OnrampRegisterWalletAddressResult.Completed -> {
          promise.resolveVoid()
        }
        is OnrampRegisterWalletAddressResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun attachKycInfo(
    kycInfo: ReadableMap,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }
    CoroutineScope(Dispatchers.IO).launch {
      val firstName = kycInfo.getString("firstName")
      val lastName = kycInfo.getString("lastName")
      val idNumber = kycInfo.getString("idNumber")

      val dateOfBirthMap = kycInfo.getMap("dateOfBirth")
      val dob =
        if (
          dateOfBirthMap != null &&
          dateOfBirthMap.hasKey("day") &&
          dateOfBirthMap.hasKey("month") &&
          dateOfBirthMap.hasKey("year")
        ) {
          DateOfBirth(
            day = dateOfBirthMap.getInt("day"),
            month = dateOfBirthMap.getInt("month"),
            year = dateOfBirthMap.getInt("year"),
          )
        } else {
          null
      }

      val addressMap = kycInfo.getMap("address")
      val addressObj = mapToPaymentSheetAddress(addressMap)
      val birthCountry = kycInfo.getString("birthCountry")?.let(CountryCode::create)
      val birthCity = kycInfo.getString("birthCity")
      val nationalities =
        kycInfo.getStringList("nationalities")
          ?.map(CountryCode::create)
          ?.takeIf { it.isNotEmpty() }

      val kycInfoObj =
        KycInfo(
          firstName = firstName,
          lastName = lastName,
          idNumber = idNumber,
          dateOfBirth = dob,
          address = addressObj,
          birthCountry = birthCountry,
          birthCity = birthCity,
          nationalities = nationalities,
        )

      when (val result = coordinator.attachKycInfo(kycInfoObj)) {
        is OnrampAttachKycInfoResult.Completed -> {
          promise.resolveVoid()
        }
        is OnrampAttachKycInfoResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun retrieveMissingIdentifiers(promise: Promise) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    CoroutineScope(Dispatchers.IO).launch {
      when (val result = coordinator.retrieveMissingIdentifiers()) {
        is OnrampRetrieveMissingIdentifiersResult.Completed -> {
          promise.resolve(mapFromComplianceIdentifierRequirements(result.requirements))
        }
        is OnrampRetrieveMissingIdentifiersResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun submitIdentifiers(
    identifiers: ReadableArray,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    val complianceIdentifiers =
      try {
        mapToComplianceIdentifiers(identifiers)
      } catch (error: IllegalArgumentException) {
        val errorType =
          if (error is ComplianceIdentifierFieldException) {
            ErrorType.Unknown
          } else {
            ErrorType.Failed
          }
        promise.resolve(createError(errorType.toString(), error.message ?: "Invalid identifiers"))
        return
      }

    CoroutineScope(Dispatchers.IO).launch {
      when (val result = coordinator.submitIdentifiers(complianceIdentifiers)) {
        is OnrampSubmitIdentifiersResult.Completed -> {
          promise.resolve(mapFromSubmitIdentifiersResult(result.result))
        }
        is OnrampSubmitIdentifiersResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun presentUserAttestation(promise: Promise) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    userAttestationPromise = promise
    presenter.presentUserAttestation()
  }

  @ReactMethod
  override fun updatePhoneNumber(
    phone: String,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }
    CoroutineScope(Dispatchers.IO).launch {
      when (val result = coordinator.updatePhoneNumber(phone)) {
        is OnrampUpdatePhoneNumberResult.Completed -> {
          promise.resolveVoid()
        }
        is OnrampUpdatePhoneNumberResult.Failed -> {
          promise.resolve(createOnrampFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun verifyIdentity(promise: Promise) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    identityVerificationPromise = promise

    presenter.verifyIdentity()
  }

  @ReactMethod
  override fun presentKycInfoVerification(
    updatedAddress: ReadableMap?,
    promise: Promise,
  ) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    val address = mapToPaymentSheetAddress(updatedAddress)

    verifyKycPromise = promise
    presenter.verifyKycInfo(address)
  }

  @ReactMethod
  override fun collectPaymentMethod(
    paymentMethod: String,
    platformPayParams: ReadableMap,
    promise: Promise,
  ) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    val method =
      when (paymentMethod) {
        "Card" -> PaymentMethodSelection.Card()
        "BankAccount" -> PaymentMethodSelection.BankAccount()
        "CardAndBankAccount" -> PaymentMethodSelection.CardAndBankAccount()
        "PlatformPay" -> {
          val googlePayParams =
            platformPayParams.getMap("googlePay")
              ?: run {
                promise.resolve(
                  createOnrampFailedError(
                    IllegalArgumentException("Missing googlePay params in platformPayParams"),
                  ),
                )
                return
              }
          val currencyCode = googlePayParams.getString("currencyCode") ?: ""
          val amount = googlePayParams.getDouble("amount").toLong()

          val transactionId = googlePayParams.getString("transactionId")
          val label = googlePayParams.getString("label")

          PaymentMethodSelection.GooglePay(
            currencyCode = currencyCode,
            amount = amount,
            transactionId = transactionId,
            label = label,
          )
        }
        else -> {
          promise.resolve(
            createOnrampFailedError(
              IllegalArgumentException("Unsupported payment method: $paymentMethod"),
            ),
          )
          return
        }
      }

    collectPaymentPromise = promise

    presenter.collectPaymentMethod(method)
  }

  @ReactMethod
  override fun createCryptoPaymentToken(promise: Promise) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    CoroutineScope(Dispatchers.IO).launch {
      val result = coordinator.createCryptoPaymentToken()
      CoroutineScope(Dispatchers.Main).launch {
        handleOnrampCreateCryptoPaymentTokenResult(result, promise)
      }
    }
  }

  @ReactMethod
  override fun performCheckout(
    onrampSessionId: String,
    promise: Promise,
  ) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    checkoutPromise = promise

    presenter.performCheckout(onrampSessionId)
  }

  @ReactMethod
  override fun provideCheckoutClientSecret(clientSecret: String?) {
    if (clientSecret != null) {
      checkoutClientSecretDeferred?.complete(clientSecret)
    } else {
      checkoutClientSecretDeferred?.completeExceptionally(
        RuntimeException("Failed to provide checkout client secret"),
      )
    }
    checkoutClientSecretDeferred = null
  }

  @ReactMethod
  override fun onrampAuthorize(
    linkAuthIntentId: String,
    promise: Promise,
  ) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    authorizePromise = promise

    presenter.authorize(linkAuthIntentId)
  }

  @ReactMethod
  override fun getCryptoTokenDisplayData(
    token: ReadableMap,
    promise: Promise,
  ) {
    val context = reactApplicationContext

    val paymentDetails: PaymentMethodPreview? =
      when {
        token.hasKey("card") -> {
          val cardMap = token.getMap("card")
          if (cardMap != null) {
            val brand = cardMap.getString("brand") ?: ""
            val funding = cardMap.getString("funding") ?: ""
            val last4 = cardMap.getString("last4") ?: ""
            val cardBrand = CardBrand.fromCode(brand)

            PaymentMethodPreview.create(
              context = context,
              details =
                PaymentMethodPreviewDetails.Card(
                  brand = cardBrand,
                  funding = funding,
                  last4 = last4,
                ),
            )
          } else {
            null
          }
        }

        token.hasKey("us_bank_account") -> {
          val bankMap = token.getMap("us_bank_account")
          if (bankMap != null) {
            val bankName = bankMap.getString("bank_name")
            val last4 = bankMap.getString("last4") ?: ""
            PaymentMethodPreview.create(
              context = context,
              details =
                PaymentMethodPreviewDetails.BankAccount(
                  bankIconCode = null,
                  bankName = bankName,
                  last4 = last4,
                ),
            )
          } else {
            null
          }
        }

        else -> null
      }

    if (paymentDetails == null) {
      promise.resolve(
        createOnrampFailedError(
          IllegalArgumentException("Unsupported payment method"),
        ),
      )
      return
    }
    rnScope.launch {
      val iconDataUri: String =
        try {
          val base64 =
            withContext(Dispatchers.Default) {
              val drawable =
                withTimeout(5_000L) {
                  withContext(Dispatchers.IO) {
                    paymentDetails.imageLoader()
                  }
                }

              getBitmapFromDrawable(drawable)?.let { bitmap ->
                getBase64FromBitmap(bitmap)
              } ?: ""
            }

          if (base64.isNotEmpty()) "data:image/png;base64,$base64" else ""
        } catch (_: Exception) {
          ""
        }

      val displayData = Arguments.createMap()
      displayData.putString("icon", iconDataUri)
      displayData.putString("label", paymentDetails.label)
      displayData.putString("sublabel", paymentDetails.sublabel)

      if (token.hasKey("card")) {
        displayData.putString("type", "Card")
      } else if (token.hasKey("us_bank_account")) {
        displayData.putString("type", "BankAccount")
      }

      promise.resolve(createResult("displayData", displayData))
    }
  }

  @ReactMethod
  override fun logout(promise: Promise) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    CoroutineScope(Dispatchers.IO).launch {
      val result = coordinator.logOut()
      CoroutineScope(Dispatchers.Main).launch {
        handleLogOutResult(result, promise)
      }
    }
  }

  @ReactMethod
  override fun authenticateUserWithToken(
    token: String,
    promise: Promise,
  ) {
    val coordinator =
      onrampCoordinator ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    CoroutineScope(Dispatchers.IO).launch {
      val result = coordinator.authenticateUserWithToken(token)

      withContext(Dispatchers.Main) {
        handleAuthenticateUserWithTokenResult(result, promise)
      }
    }
  }

  @ReactMethod
  override fun addListener(eventType: String?) {
    // noop, iOS only
  }

  @ReactMethod
  override fun removeListeners(count: Double) {
    // noop, iOS only
  }

  private fun handleOnrampIdentityVerificationResult(
    result: OnrampVerifyIdentityResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampVerifyIdentityResult.Completed -> {
        promise.resolveVoid()
      }
      is OnrampVerifyIdentityResult.Cancelled -> {
        promise.resolve(createCanceledError("Identity verification was cancelled"))
      }
      is OnrampVerifyIdentityResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleOnrampKycVerificationResult(
    result: OnrampVerifyKycInfoResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampVerifyKycInfoResult.Confirmed -> {
        promise.resolve(
          WritableNativeMap().apply { putString("status", "Confirmed") },
        )
      }
      is OnrampVerifyKycInfoResult.UpdateAddress -> {
        promise.resolve(
          WritableNativeMap().apply { putString("status", "UpdateAddress") },
        )
      }
      is OnrampVerifyKycInfoResult.Cancelled -> {
        promise.resolve(createCanceledError("KYC verification was cancelled"))
      }
      is OnrampVerifyKycInfoResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleUserAttestationResult(
    result: OnrampUserAttestationResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampUserAttestationResult.Confirmed -> {
        promise.resolve(
          WritableNativeMap().apply { putString("status", "Confirmed") },
        )
      }
      is OnrampUserAttestationResult.Cancelled -> {
        promise.resolve(createCanceledError("User attestation was canceled"))
      }
      is OnrampUserAttestationResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleOnrampCollectPaymentResult(
    result: OnrampCollectPaymentMethodResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampCollectPaymentMethodResult.Completed -> {
        rnScope.launch {
          val iconDataUri =
            try {
              val base64 =
                withContext(Dispatchers.Default) {
                  val drawable =
                    withTimeout(5_000L) {
                      withContext(Dispatchers.IO) {
                        result.displayData.imageLoader()
                      }
                    }

                  getBitmapFromDrawable(drawable)?.let { bitmap ->
                    getBase64FromBitmap(bitmap)
                  } ?: ""
                }

              if (base64.isNotEmpty()) "data:image/png;base64,$base64" else ""
            } catch (_: Exception) {
              ""
            }

          val displayData = Arguments.createMap()
          displayData.putString("icon", iconDataUri)
          displayData.putString("label", result.displayData.label)
          result.displayData.sublabel?.let { displayData.putString("sublabel", it) }
          displayData.putString("type", mapPaymentDetailsType(result.displayData.type))

          val map = Arguments.createMap()
          map.putMap("displayData", displayData)
          result.kycInfo?.let { map.putMap("kycInfo", mapFromKycInfo(it)) }
          promise.resolve(map)
        }
      }

      is OnrampCollectPaymentMethodResult.Cancelled -> {
        promise.resolve(createCanceledError("Payment collection was cancelled"))
      }

      is OnrampCollectPaymentMethodResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleOnrampAuthorizationResult(
    result: OnrampAuthorizeResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampAuthorizeResult.Consented -> {
        promise.resolve(
          WritableNativeMap().apply {
            putString("status", "Consented")
            putString("customerId", result.customerId)
          },
        )
      }
      is OnrampAuthorizeResult.Denied -> {
        promise.resolve(
          WritableNativeMap().apply {
            putString("status", "Denied")
          },
        )
      }
      is OnrampAuthorizeResult.Canceled -> {
        promise.resolve(createCanceledError("Authorization was cancelled"))
      }
      is OnrampAuthorizeResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleOnrampCheckoutResult(
    result: OnrampCheckoutResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampCheckoutResult.Completed -> {
        promise.resolveVoid()
      }
      is OnrampCheckoutResult.Canceled -> {
        promise.resolve(createCanceledError("Checkout was cancelled"))
      }
      is OnrampCheckoutResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleOnrampCreateCryptoPaymentTokenResult(
    result: OnrampCreateCryptoPaymentTokenResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampCreateCryptoPaymentTokenResult.Completed -> {
        promise.resolveString("cryptoPaymentToken", result.cryptoPaymentToken)
      }
      is OnrampCreateCryptoPaymentTokenResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleLogOutResult(
    result: OnrampLogOutResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampLogOutResult.Completed -> {
        promise.resolveVoid()
      }
      is OnrampLogOutResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun handleAuthenticateUserWithTokenResult(
    result: OnrampTokenAuthenticationResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampTokenAuthenticationResult.Completed -> {
        promise.resolveVoid()
      }
      is OnrampTokenAuthenticationResult.Failed -> {
        promise.resolve(createOnrampFailedError(result.error))
      }
    }
  }

  private fun Promise.resolveVoid() {
    resolve(createEmptyResult())
  }

  private fun Promise.resolveString(
    key: String,
    value: String,
  ) {
    resolve(WritableNativeMap().apply { putString(key, value) })
  }

  private fun Promise.resolveBoolean(
    key: String,
    value: Boolean,
  ) {
    resolve(WritableNativeMap().apply { putBoolean(key, value) })
  }

  private fun onrampAdditionalSdkVersions(): List<SDKVersion> =
    reactNativeSdkVersion?.let {
      listOf(
        SDKVersion(
          name = "stripe-react-native",
          version = it,
        ),
      )
    } ?: emptyList()
}
