package com.reactnativestripesdk

import androidx.activity.ComponentActivity
import androidx.lifecycle.SavedStateHandle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.stripe.android.link.LinkController
import com.stripe.android.link.LinkControllerPreview
import kotlinx.coroutines.CoroutineScope
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

    fun configure(params: ReadableMap, promise: Promise) {
        val email = params.getString("email")
        val merchantDisplayName = params.getString("merchantDisplayName")

        if (email == null || merchantDisplayName == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), "email and merchantDisplayName are required."))
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

        val supportedTypes: List<LinkController.PaymentMethodType>? =
            params.getArray("supportedPaymentMethodTypes")?.let { arr ->
                (0 until arr.size()).mapNotNull { i ->
                    when (arr.getString(i)) {
                        "card" -> LinkController.PaymentMethodType.Card
                        "bankAccount" -> LinkController.PaymentMethodType.BankAccount
                        else -> null
                    }
                }.ifEmpty { null }
            }

        val config = LinkController.Configuration(
            publishableKey = publishableKey,
            merchantDisplayName = merchantDisplayName,
            email = email,
            stripeAccountId = stripeAccountId
        )
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

        CoroutineScope(Dispatchers.Main).launch {
            val result = controller.configure(config)
            if (result.isSuccess) {
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
        val activity = context.currentActivity as? ComponentActivity
        if (activity == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), "Activity is not available. Retry this method."))
            return
        }

        val controller = linkController
        if (controller == null) {
            promise.resolve(createError(ErrorType.Failed.toString(), LINK_CONTROLLER_NOT_INITIALIZED_ERROR))
            return
        }

        val presenter = controller.createPresenter(
            activity = activity,
            presentCallback = { result ->
                when (result) {
                    is LinkController.PresentResult.Completed -> {
                        val response = Arguments.createMap()
                        response.putMap("paymentMethod", mapFromPaymentMethod(result.paymentMethod))

                        val preview = controller.paymentMethodPreview.value
                        if (preview != null) {
                            CoroutineScope(Dispatchers.Main).launch {
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
        )
        presenter.present()
    }
}
