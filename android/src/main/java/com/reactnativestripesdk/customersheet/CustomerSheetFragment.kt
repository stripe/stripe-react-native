package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.graphics.drawable.toBitmap
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.*
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.*
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.stripe.android.customersheet.CustomerAdapter
import com.stripe.android.customersheet.CustomerEphemeralKey
import com.stripe.android.customersheet.CustomerEphemeralKeyProvider
import com.stripe.android.customersheet.CustomerSheet
import com.stripe.android.customersheet.CustomerSheetResult
import com.stripe.android.customersheet.ExperimentalCustomerSheetApi
import com.stripe.android.customersheet.PaymentOptionSelection
import com.stripe.android.customersheet.SetupIntentClientSecretProvider
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentsheet.*
import kotlinx.coroutines.CompletableDeferred
import java.io.ByteArrayOutputStream
import kotlin.Exception


@OptIn(ExperimentalCustomerSheetApi::class)
class CustomerSheetFragment(private val context: ReactApplicationContext,) : Fragment() {
  private var customerSheet: CustomerSheet? = null
  private var customerAdapter: CustomerAdapter? = null

  private var presentPromise: Promise? = null
  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    val initPromise = context.getNativeModule(StripeSdkModule::class.java)?.customerSheetInitPromise ?: return

    val headerTextForSelectionScreen = arguments?.getString("headerTextForSelectionScreen")
    val merchantDisplayName = arguments?.getString("merchantDisplayName")
    val googlePayEnabled = arguments?.getBoolean("googlePayEnabled") ?: false
    val billingDetailsBundle = arguments?.getBundle("defaultBillingDetails")
    val billingConfigParams = arguments?.getBundle("billingDetailsCollectionConfiguration")
    val setupIntentClientSecret = arguments?.getString("setupIntentClientSecret")
    val customerId = arguments?.getString("customerId")
    val customerEphemeralKeySecret = arguments?.getString("customerEphemeralKeySecret")

    if (customerId == null) {
      initPromise.resolve(createError(ErrorType.Failed.toString(), "You must provide a value for `customerId`"))
      return
    }
    if (customerEphemeralKeySecret == null) {
      initPromise.resolve(createError(ErrorType.Failed.toString(), "You must provide a value for `customerEphemeralKeySecret`"))
      return
    }

    val appearance = try {
      buildPaymentSheetAppearance(arguments?.getBundle("appearance"), context)
    } catch (error: PaymentSheetAppearanceException) {
      initPromise.resolve(createError(ErrorType.Failed.toString(), error))
      return
    }

    val configuration = CustomerSheet.Configuration.builder()
      .appearance(appearance)
      .googlePayEnabled(googlePayEnabled)
      .merchantDisplayName(merchantDisplayName)
      .headerTextForSelectionScreen(headerTextForSelectionScreen)

    billingDetailsBundle?.let {
      configuration.defaultBillingDetails(createDefaultBillingDetails(billingDetailsBundle))
    }
    billingConfigParams?.let {
      configuration.billingDetailsCollectionConfiguration(createBillingDetailsCollectionConfiguration(billingConfigParams))
    }

    val customerAdapter = createCustomerAdapter(
      context, customerId, customerEphemeralKeySecret, setupIntentClientSecret
    ).also {
      this.customerAdapter = it
    }

    customerSheet = CustomerSheet.create(
      fragment = this,
      configuration = configuration.build(),
      customerAdapter = customerAdapter,
      callback = ::handleResult
    )

    initPromise.resolve(WritableNativeMap())
  }

  private fun handleResult(result: CustomerSheetResult) {
    var promiseResult = Arguments.createMap()
    when (result) {
      is CustomerSheetResult.Failed -> {
        presentPromise?.resolve(createError(ErrorType.Failed.toString(), result.exception))
      }
      is CustomerSheetResult.Selected -> {
        promiseResult = createPaymentOptionResult(result.selection)
      }
      is CustomerSheetResult.Canceled -> {
        promiseResult = createPaymentOptionResult(result.selection)
        promiseResult.putMap("error", Arguments.createMap().also { it.putString("code", ErrorType.Canceled.toString()) })
      }
    }
    presentPromise?.resolve(promiseResult)
  }

  fun present(timeout: Long?, promise: Promise) {
    presentPromise = promise
    if (timeout != null) {
      presentWithTimeout(timeout)
    }
    customerSheet?.present() ?: run {
      presentPromise?.resolve(createMissingInitError())
    }
  }

  private fun presentWithTimeout(timeout: Long) {
    var customerSheetActivity: Activity? = null

    val activityLifecycleCallbacks = object : Application.ActivityLifecycleCallbacks {
      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        customerSheetActivity = activity
      }

      override fun onActivityStarted(activity: Activity) {}

      override fun onActivityResumed(activity: Activity) {}

      override fun onActivityPaused(activity: Activity) {}

      override fun onActivityStopped(activity: Activity) {}

      override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}

      override fun onActivityDestroyed(activity: Activity) {
        customerSheetActivity = null
        context.currentActivity?.application?.unregisterActivityLifecycleCallbacks(this)
      }
    }

    Handler(Looper.getMainLooper()).postDelayed({
      customerSheetActivity?.finish()
    }, timeout)

    context.currentActivity?.application?.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)

    customerSheet?.present() ?: run {
      presentPromise?.resolve(createMissingInitError())
    }
  }

  companion object {
    internal const val TAG = "customer_sheet_launch_fragment"

    internal fun createMissingInitError(): WritableMap {
      return createError(ErrorType.Failed.toString(), "No customer sheet has been initialized yet.")
    }

    internal fun createDefaultBillingDetails(bundle: Bundle): PaymentSheet.BillingDetails {
      var defaultBillingDetails: PaymentSheet.BillingDetails? = null
      val addressBundle = bundle.getBundle("address")
      val address = PaymentSheet.Address(
        addressBundle?.getString("city"),
        addressBundle?.getString("country"),
        addressBundle?.getString("line1"),
        addressBundle?.getString("line2"),
        addressBundle?.getString("postalCode"),
        addressBundle?.getString("state"))
      defaultBillingDetails = PaymentSheet.BillingDetails(
        address,
        bundle.getString("email"),
        bundle.getString("name"),
        bundle.getString("phone"))
      return defaultBillingDetails
    }

    internal fun createBillingDetailsCollectionConfiguration(bundle: Bundle): PaymentSheet.BillingDetailsCollectionConfiguration {
      return PaymentSheet.BillingDetailsCollectionConfiguration(
        name = mapToCollectionMode(bundle.getString("name")),
        phone = mapToCollectionMode(bundle.getString("phone")),
        email = mapToCollectionMode(bundle.getString("email")),
        address = mapToAddressCollectionMode(bundle.getString("address")),
        attachDefaultsToPaymentMethod = bundle.getBoolean("attachDefaultsToPaymentMethod")
          ?: false
      )
    }

    internal fun createCustomerAdapter(
      context: Context,
      customerId: String,
      customerEphemeralKeySecret: String,
      setupIntentClientSecret: String?
    ): CustomerAdapter {
      val ephemeralKeyProvider = {
        CustomerAdapter.Result.success(
          CustomerEphemeralKey.create(
            customerId = customerId,
            ephemeralKey = customerEphemeralKeySecret,
          )
        )
      }
      if (setupIntentClientSecret != null) {
        return CustomerAdapter.create(
          context,
          customerEphemeralKeyProvider = ephemeralKeyProvider,
          setupIntentClientSecretProvider = {
            CustomerAdapter.Result.success(
              setupIntentClientSecret,
            )
          }
        )
      }
      return CustomerAdapter.create(
        context,
        customerEphemeralKeyProvider = ephemeralKeyProvider,
        setupIntentClientSecretProvider = null
      )
    }

    internal fun createPaymentOptionResult(selection: PaymentOptionSelection?): WritableMap {
      var paymentOptionResult = Arguments.createMap()

      when (selection) {
        is PaymentOptionSelection.GooglePay -> {
          paymentOptionResult = buildResult(
            selection.paymentOption.label,
            selection.paymentOption.icon(),
            null)
        }
        is PaymentOptionSelection.PaymentMethod -> {
          paymentOptionResult = buildResult(
            selection.paymentOption.label,
            selection.paymentOption.icon(),
            selection.paymentMethod)
        }
        null -> {}
      }

      return paymentOptionResult
    }

    internal fun buildResult(label: String, drawable: Drawable, paymentMethod: PaymentMethod?): WritableMap {
      val result = Arguments.createMap()
      val paymentOption = Arguments.createMap().also {
        it.putString("label", label)
        it.putString("image", getBase64FromBitmap(getBitmapFromDrawable(drawable)))
      }
      result.putMap("paymentOption", paymentOption)
      if (paymentMethod != null) {
        result.putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
      }
      return result
    }
  }
}