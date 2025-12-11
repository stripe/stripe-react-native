package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Application
import androidx.activity.ComponentActivity
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.SavedStateHandle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createCanceledError
import com.reactnativestripesdk.utils.createEmptyResult
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createFailedError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createMissingInitError
import com.reactnativestripesdk.utils.createOnrampNotConfiguredError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.getValOr
import com.reactnativestripesdk.utils.mapToPaymentSheetAddress
import com.stripe.android.crypto.onramp.OnrampCoordinator
import com.stripe.android.crypto.onramp.model.CryptoNetwork
import com.stripe.android.crypto.onramp.model.KycInfo
import com.stripe.android.crypto.onramp.model.LinkUserInfo
import com.stripe.android.crypto.onramp.model.OnrampAttachKycInfoResult
import com.stripe.android.crypto.onramp.model.OnrampAuthenticateResult
import com.stripe.android.crypto.onramp.model.OnrampAuthorizeResult
import com.stripe.android.crypto.onramp.model.OnrampCallbacks
import com.stripe.android.crypto.onramp.model.OnrampCheckoutResult
import com.stripe.android.crypto.onramp.model.OnrampCollectPaymentMethodResult
import com.stripe.android.crypto.onramp.model.OnrampConfiguration
import com.stripe.android.crypto.onramp.model.OnrampConfigurationResult
import com.stripe.android.crypto.onramp.model.OnrampCreateCryptoPaymentTokenResult
import com.stripe.android.crypto.onramp.model.OnrampHasLinkAccountResult
import com.stripe.android.crypto.onramp.model.OnrampLogOutResult
import com.stripe.android.crypto.onramp.model.OnrampRegisterLinkUserResult
import com.stripe.android.crypto.onramp.model.OnrampRegisterWalletAddressResult
import com.stripe.android.crypto.onramp.model.OnrampTokenAuthenticationResult
import com.stripe.android.crypto.onramp.model.OnrampUpdatePhoneNumberResult
import com.stripe.android.crypto.onramp.model.OnrampVerifyIdentityResult
import com.stripe.android.crypto.onramp.model.OnrampVerifyKycInfoResult
import com.stripe.android.crypto.onramp.model.PaymentMethodType
import com.stripe.android.link.LinkAppearance
import com.stripe.android.link.LinkAppearance.Colors
import com.stripe.android.link.LinkAppearance.PrimaryButton
import com.stripe.android.link.LinkAppearance.Style
import com.stripe.android.link.LinkController.PaymentMethodPreview
import com.stripe.android.link.PaymentMethodPreviewDetails
import com.stripe.android.model.CardBrand
import com.stripe.android.model.DateOfBirth
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@SuppressLint("RestrictedApi")
@ReactModule(name = NativeOnrampSdkModuleSpec.NAME)
class OnrampSdkModule(
  reactContext: ReactApplicationContext,
) : NativeOnrampSdkModuleSpec(reactContext) {
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

  private var checkoutClientSecretDeferred: CompletableDeferred<String>? = null

  @ReactMethod
  override fun initialise(
    params: ReadableMap,
    promise: Promise,
  ) {
    // Note: This method depends on `StripeSdkModule#initialise()` being called as well.
    val publishableKey = getValOr(params, "publishableKey", null) as String
    this.stripeAccountId = getValOr(params, "stripeAccountId", null)
    this.publishableKey = publishableKey

    promise.resolve(null)
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

    val coordinator =
      onrampCoordinator ?: OnrampCoordinator
        .Builder()
        .build(application, SavedStateHandle())
        .also { this.onrampCoordinator = it }

    CoroutineScope(Dispatchers.IO).launch {
      val appearanceMap = config.getMap("appearance")
      val appearance =
        if (appearanceMap != null) {
          mapAppearance(appearanceMap)
        } else {
          LinkAppearance(style = Style.AUTOMATIC)
        }

      val displayName = config.getString("merchantDisplayName") ?: ""

      val cryptoCustomerId = config.getString("cryptoCustomerId")

      val configuration =
        OnrampConfiguration(
          merchantDisplayName = displayName,
          publishableKey = publishableKey,
          appearance = appearance,
          cryptoCustomerId = cryptoCustomerId,
        )

      val configureResult = coordinator.configure(configuration)

      CoroutineScope(Dispatchers.Main).launch {
        when (configureResult) {
          is OnrampConfigurationResult.Completed -> {
            createOnrampPresenter(promise)
          }
          is OnrampConfigurationResult.Failed -> {
            promise.resolve(createError(ErrorType.Failed.toString(), configureResult.error))
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

    val onrampCallbacks =
      OnrampCallbacks(
        authenticateUserCallback = { result ->
          handleOnrampAuthenticationResult(result, authenticateUserPromise!!)
        },
        verifyIdentityCallback = { result ->
          handleOnrampIdentityVerificationResult(result, identityVerificationPromise!!)
        },
        collectPaymentCallback = { result ->
          handleOnrampCollectPaymentResult(result, collectPaymentPromise!!)
        },
        authorizeCallback = { result ->
          handleOnrampAuthorizationResult(result, authorizePromise!!)
        },
        checkoutCallback = { result ->
          handleOnrampCheckoutResult(result, checkoutPromise!!)
        },
        verifyKycCallback = { result ->
          handleOnrampKycVerificationResult(result, verifyKycPromise!!)
        },
      )

    try {
      onrampPresenter = onrampCoordinator!!.createPresenter(activity, onrampCallbacks)
      promise.resolveVoid()
    } catch (e: Exception) {
      promise.resolve(createFailedError(e))
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
          promise.resolve(createFailedError(result.error))
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
          promise.resolve(createFailedError(result.error))
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
          promise.resolve(createFailedError(result.error))
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
      if (firstName.isNullOrEmpty()) {
        promise.resolve(
          createError(
            ErrorType.Unknown.toString(),
            "Missing required field: firstName",
          ),
        )
        return@launch
      }
      val lastName = kycInfo.getString("lastName")
      if (lastName.isNullOrEmpty()) {
        promise.resolve(
          createError(
            ErrorType.Unknown.toString(),
            "Missing required field: lastName",
          ),
        )
        return@launch
      }
      val idNumber = kycInfo.getString("idNumber")
      if (idNumber.isNullOrEmpty()) {
        promise.resolve(
          createError(
            ErrorType.Unknown.toString(),
            "Missing required field: idNumber",
          ),
        )
        return@launch
      }

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
          promise.resolve(
            createError(
              ErrorType.Unknown.toString(),
              "Missing required field: dateOfBirth",
            ),
          )
          return@launch
        }

      val addressMap = kycInfo.getMap("address")
      val addressObj = mapToPaymentSheetAddress(addressMap) ?: PaymentSheet.Address()

      val kycInfoObj =
        KycInfo(
          firstName = firstName,
          lastName = lastName,
          idNumber = idNumber,
          dateOfBirth = dob,
          address = addressObj,
        )

      when (val result = coordinator.attachKycInfo(kycInfoObj)) {
        is OnrampAttachKycInfoResult.Completed -> {
          promise.resolveVoid()
        }
        is OnrampAttachKycInfoResult.Failed -> {
          promise.resolve(createFailedError(result.error))
        }
      }
    }
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
        OnrampUpdatePhoneNumberResult.Completed -> {
          promise.resolveVoid()
        }
        is OnrampUpdatePhoneNumberResult.Failed -> {
          promise.resolve(createFailedError(result.error))
        }
      }
    }
  }

  @ReactMethod
  override fun authenticateUser(promise: Promise) {
    val presenter =
      onrampPresenter ?: run {
        promise.resolve(createOnrampNotConfiguredError())
        return
      }

    authenticateUserPromise = promise

    presenter.authenticateUser()
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
        "Card" -> PaymentMethodType.Card
        "BankAccount" -> PaymentMethodType.BankAccount
        else -> {
          promise.resolve(
            createFailedError(
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

    val checkoutHandler: suspend () -> String = {
      checkoutClientSecretDeferred = CompletableDeferred()

      val params = Arguments.createMap()
      params.putString("onrampSessionId", onrampSessionId)

      emitOnCheckoutClientSecretRequested(params)

      checkoutClientSecretDeferred!!.await()
    }

    checkoutPromise = promise

    presenter.performCheckout(onrampSessionId, checkoutHandler)
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
        createFailedError(
          IllegalArgumentException("Unsupported payment method"),
        ),
      )
      return
    }

    val icon =
      reactApplicationContext.currentActivity
        ?.let { ContextCompat.getDrawable(it, paymentDetails.iconRes) }
        ?.let { "data:image/png;base64," + getBase64FromBitmap(getBitmapFromDrawable(it)) }

    val displayData = Arguments.createMap()

    displayData.putString("icon", icon)
    displayData.putString("label", paymentDetails.label)
    displayData.putString("sublabel", paymentDetails.sublabel)

    promise.resolve(createResult("displayData", displayData))
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

  private fun mapAppearance(appearanceMap: ReadableMap): LinkAppearance {
    val lightColorsMap = appearanceMap.getMap("lightColors")
    val darkColorsMap = appearanceMap.getMap("darkColors")
    val styleStr = appearanceMap.getString("style")
    val primaryButtonMap = appearanceMap.getMap("primaryButton")

    val lightColors =
      if (lightColorsMap != null) {
        val primaryColorStr = lightColorsMap.getString("primary")
        val contentColorStr = lightColorsMap.getString("contentOnPrimary")
        val borderSelectedColorStr = lightColorsMap.getString("borderSelected")

        Colors(
          primary = Color(android.graphics.Color.parseColor(primaryColorStr)),
          contentOnPrimary = Color(android.graphics.Color.parseColor(contentColorStr)),
          borderSelected = Color(android.graphics.Color.parseColor(borderSelectedColorStr)),
        )
      } else {
        null
      }

    val darkColors =
      if (darkColorsMap != null) {
        val primaryColorStr = darkColorsMap.getString("primary")
        val contentColorStr = darkColorsMap.getString("contentOnPrimary")
        val borderSelectedColorStr = darkColorsMap.getString("borderSelected")

        Colors(
          primary = Color(android.graphics.Color.parseColor(primaryColorStr)),
          contentOnPrimary = Color(android.graphics.Color.parseColor(contentColorStr)),
          borderSelected = Color(android.graphics.Color.parseColor(borderSelectedColorStr)),
        )
      } else {
        null
      }

    val style =
      when (styleStr) {
        "ALWAYS_LIGHT" -> Style.ALWAYS_LIGHT
        "ALWAYS_DARK" -> Style.ALWAYS_DARK
        else -> Style.AUTOMATIC
      }

    val primaryButton =
      if (primaryButtonMap != null) {
        PrimaryButton(
          cornerRadiusDp =
            if (primaryButtonMap.hasKey("cornerRadius")) {
              primaryButtonMap.getDouble("cornerRadius").toFloat()
            } else {
              null
            },
          heightDp =
            if (primaryButtonMap.hasKey("height")) {
              primaryButtonMap.getDouble("height").toFloat()
            } else {
              null
            },
        )
      } else {
        null
      }

    val default = LinkAppearance(style = Style.AUTOMATIC)
    return LinkAppearance(
      lightColors = lightColors ?: default.lightColors,
      darkColors = darkColors ?: default.darkColors,
      style = style,
      primaryButton = primaryButton ?: default.primaryButton,
    )
  }

  private fun handleOnrampAuthenticationResult(
    result: OnrampAuthenticateResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampAuthenticateResult.Completed -> {
        promise.resolveString("customerId", result.customerId)
      }
      is OnrampAuthenticateResult.Cancelled -> {
        promise.resolve(createCanceledError("Authentication was cancelled"))
      }
      is OnrampAuthenticateResult.Failed -> {
        promise.resolve(createFailedError(result.error))
      }
    }
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
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
      }
    }
  }

  private fun handleOnrampCollectPaymentResult(
    result: OnrampCollectPaymentMethodResult,
    promise: Promise,
  ) {
    when (result) {
      is OnrampCollectPaymentMethodResult.Completed -> {
        val displayData = Arguments.createMap()
        val icon =
          reactApplicationContext.currentActivity
            ?.let { ContextCompat.getDrawable(it, result.displayData.iconRes) }
            ?.let { "data:image/png;base64," + getBase64FromBitmap(getBitmapFromDrawable(it)) }
        displayData.putString("icon", icon)
        displayData.putString("label", result.displayData.label)
        result.displayData.sublabel?.let { displayData.putString("sublabel", it) }
        promise.resolve(createResult("displayData", displayData))
      }
      is OnrampCollectPaymentMethodResult.Cancelled -> {
        promise.resolve(createCanceledError("Payment collection was cancelled"))
      }
      is OnrampCollectPaymentMethodResult.Failed -> {
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
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
        promise.resolve(createFailedError(result.error))
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
}
