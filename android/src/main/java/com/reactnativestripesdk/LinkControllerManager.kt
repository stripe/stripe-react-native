package com.reactnativestripesdk

import androidx.activity.ComponentActivity
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.lifecycleScope
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.stripe.android.link.LinkController
import com.stripe.android.link.LinkControllerPreview
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal const val LINK_CONTROLLER_NOT_INITIALIZED_ERROR =
    "LinkController has not been initialized. Call initLinkController first."

/**
 * Manages [LinkController] initialization and presentation for the React Native bridge.
 *
 * @PrivatePreview
 */
@OptIn(LinkControllerPreview::class)
internal class LinkControllerManager(
    private val context: ReactApplicationContext,
    private val publishableKey: String,
    private val stripeAccountId: String?,
) {
    private var linkController: LinkController? = null
    private var linkPresenter: LinkController.Presenter? = null
    private var presentPromise: Promise? = null

    fun configure(params: ReadableMap, promise: Promise) {
        val email = params.getString("email")
        val merchantDisplayName = params.getString("merchantDisplayName")
        if (merchantDisplayName == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), "merchantDisplayName is required."))
            return
        }

        val activity = context.currentActivity as? ComponentActivity
        if (activity == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), "Activity is not available. Retry this method."))
            return
        }

        val phoneNumber = params.getString("phoneNumber")
        val allowLogout = if (params.hasKey("allowLogout")) params.getBoolean("allowLogout") else true
        val setupIntentClientSecret = params.getString("setupIntentClientSecret")

        val supportedTypes = parseSupportedPaymentMethodTypes(params)

        val config = LinkController.Configuration(
            merchantDisplayName = merchantDisplayName,
            publishableKey = publishableKey,
            stripeAccountId = stripeAccountId
        )
            .also { if (email != null) it.email(email) }
            .phoneNumber(phoneNumber)
            .supportedPaymentMethodTypes(supportedTypes)
            .allowLogout(allowLogout)
            .setupIntentClientSecret(setupIntentClientSecret)

        // Build a new controller if this is the first call or after a reset.
        // SavedStateHandle() is empty — state will not survive process death, which is
        // the same trade-off made by other Stripe RN SDK APIs.
        if (linkController == null) {
            linkController = LinkController.Builder(
                application = activity.application,
                savedStateHandle = SavedStateHandle()
            ).build()
        }

        val controller = linkController!!

        activity.lifecycleScope.launch {
            val result = controller.configure(config)
            if (result.isSuccess) {
                // Create once: presenter may register ActivityResultLaunchers, which must happen before onStart().
                if (linkPresenter == null) {
                    linkPresenter = controller.createPresenter(
                        activity = activity,
                        presentCallback = { presentResult -> handlePresentResult(presentResult) }
                    )
                }
                promise.resolve(Arguments.createMap())
            } else {
                promise.resolve(
                    createError(
                        ErrorType.Failed.toString(),
                        result.exceptionOrNull()?.message ?: "LinkController configuration failed."
                    )
                )
            }
        }
    }

    fun present(promise: Promise) {
        val presenter = linkPresenter
        if (presenter == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), LINK_CONTROLLER_NOT_INITIALIZED_ERROR))
            return
        }

        presentPromise = promise
        presenter.present()
    }

    fun destroy() {
        linkController = null
        linkPresenter = null
        presentPromise = null
    }

    private fun parseSupportedPaymentMethodTypes(params: ReadableMap): List<LinkController.PaymentMethodType>? =
        params.getArray("supportedPaymentMethodTypes")?.let { arr ->
            (0 until arr.size()).mapNotNull { i ->
                when (arr.getString(i)) {
                    "card" -> LinkController.PaymentMethodType.Card
                    "bankAccount" -> LinkController.PaymentMethodType.BankAccount
                    else -> null
                }
            }.ifEmpty { null }
        }

    private fun handlePresentResult(result: LinkController.PresentResult) {
        val promise = presentPromise ?: return
        val controller = linkController ?: return
        when (result) {
            is LinkController.PresentResult.Completed -> {
                val response = Arguments.createMap()
                response.putMap("paymentMethod", mapFromPaymentMethod(result.paymentMethod))

                val preview = controller.paymentMethodPreview.value
                val currentScope = (context.currentActivity as? ComponentActivity)?.lifecycleScope
                if (preview != null && currentScope != null) {
                    currentScope.launch {
                        val iconBase64 = withContext(Dispatchers.IO) {
                            try {
                                convertDrawableToBase64(preview.icon)
                            } catch (_: Exception) {
                                null
                            }
                        }
                        val previewMap = Arguments.createMap()
                        previewMap.putString("label", preview.label)
                        preview.sublabel?.let { previewMap.putString("sublabel", it) }
                        if (iconBase64 != null) {
                            previewMap.putString("icon", "data:image/png;base64,$iconBase64")
                        }
                        response.putMap("paymentMethodPreview", previewMap)
                        promise.resolve(response)
                    }
                } else {
                    promise.resolve(response)
                }
            }
            is LinkController.PresentResult.Canceled -> {
                promise.resolve(
                    createError(
                        ErrorType.Canceled.toString(),
                        "The customer canceled the Link flow."
                    )
                )
            }
            is LinkController.PresentResult.Failed -> {
                promise.resolve(createError(ErrorType.Failed.toString(), result.error))
            }
        }
    }
}
