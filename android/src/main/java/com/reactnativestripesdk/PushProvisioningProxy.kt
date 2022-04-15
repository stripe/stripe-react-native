package com.reactnativestripesdk

import android.app.Activity
import android.app.Activity.RESULT_OK
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.google.android.gms.tapandpay.TapAndPay
import com.google.android.gms.tapandpay.TapAndPayClient
import com.google.android.gms.tapandpay.issuer.TokenInfo
import com.stripe.android.pushProvisioning.PushProvisioningActivity
import com.stripe.android.pushProvisioning.PushProvisioningActivityStarter


object PushProvisioningProxy {
  private const val TAG = "StripePushProvisioning"
  private const val REQUEST_CODE_TOKENIZE = 90909
  private var description = "Added by Stripe"
  private var tapAndPayClient: TapAndPayClient? = null
  private var tokenRequiringTokenization: ReadableMap? = null

  fun getApiVersion(): String {
    return try {
      // PushProvisioningActivity.API_VERSION
      "2019-09-09"
    } catch (e: Exception) {
      Log.e(TAG, "PushProvisioning dependency not found")
      ""
    }
  }

  fun invoke(
    context: ReactApplicationContext,
    view: AddToWalletButtonView,
    cardDescription: String,
    ephemeralKey: String,
    token: ReadableMap?
  ) {
    try {
      Class.forName("com.stripe.android.pushProvisioning.PushProvisioningActivityStarter")
      description = cardDescription
      tokenRequiringTokenization = token
      createActivityEventListener(context, view)
      DefaultPushProvisioningProxy().beginPushProvisioning(
        context.currentActivity!!,
        description,
        EphemeralKeyProvider(ephemeralKey)
      )
    } catch (e: Exception) {
      Log.e(TAG, "PushProvisioning dependency not found")
    }
  }

  fun isCardInWallet(activity: Activity, cardLastFour: String, promise: Promise) {
    try {
      Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")

      tapAndPayClient = TapAndPay.getClient(activity).also {
        it.listTokens()
          .addOnCompleteListener { task ->
            if (task.isSuccessful) {
              for (token in task.result) {
                if (token.fpanLastFour == cardLastFour) {
                  promise.resolve(createResult(true, token))
                  return@addOnCompleteListener
                }
              }
            } else {
              Log.e(TAG, "Unable to fetch existing tokens from Google TapAndPay.")
            }
            promise.resolve(createResult(false))
          }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Google TapAndPay dependency not found")
      promise.resolve(createError("Failed", "Google TapAndPay dependency not found."))
    }
  }

  private fun createActivityEventListener(context: ReactApplicationContext, view: AddToWalletButtonView) {
    val listener = object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(activity, requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_TOKENIZE) {
          view.dispatchEvent(
            if (resultCode == RESULT_OK) null else mapError("Failed", "Failed to resolve yellow path.", null, null, null, null)
          )
        } else if (requestCode == PushProvisioningActivityStarter.REQUEST_CODE) {
          if (resultCode == PushProvisioningActivity.RESULT_OK) {

            tokenRequiringTokenization?.let {
              val tokenReferenceId = it.getString("id")
              if (tokenReferenceId.isNullOrBlank()) {
                view.dispatchEvent(
                  mapError("Failed", "Token object passed to `<AddToWalletButton />` is missing the `id` field.", null, null, null, null)
                )
              } else {
                tapAndPayClient?.tokenize(
                  activity,
                  tokenReferenceId,
                  it.getInt("serviceProvider"),
                  description,
                  it.getInt("network"),
                  REQUEST_CODE_TOKENIZE
                )
              }
            } ?: run {
              view.dispatchEvent(null)
            }
          } else if (resultCode == PushProvisioningActivity.RESULT_ERROR) {
            data?.let {
              val error: PushProvisioningActivityStarter.Error = PushProvisioningActivityStarter.Error.fromIntent(data)
              view.dispatchEvent(
                mapError(error.code.toString(), error.message, null, null, null, null)
              )
            }
          }
        }
      }
    }
    context.addActivityEventListener(listener)
  }

  private fun createResult(cardIsInWallet: Boolean, token: TokenInfo? = null): WritableMap {
    val result = WritableNativeMap()
    result.putBoolean("isInWallet", cardIsInWallet)
    result.putMap("token", mapFromTokenInfo(token))
    return result
  }

  private fun mapFromTokenInfo(token: TokenInfo?): WritableMap? {
    if (token == null) {
      return null
    }
    val result = WritableNativeMap()
    result.putString("id", token.issuerTokenId)
    result.putString("cardLastFour", token.fpanLastFour)
    result.putInt("network", token.network)
    result.putInt("serviceProvider", token.tokenServiceProvider)
    result.putString("issuer", token.issuerName)
    result.putString("status", mapFromTokenState(token.tokenState))

    return result
  }

  private fun mapFromTokenState(status: Int): String {
    return when (status) {
      TapAndPay.TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION -> "TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION"
      TapAndPay.TOKEN_STATE_PENDING -> "TOKEN_STATE_PENDING"
      TapAndPay.TOKEN_STATE_SUSPENDED -> "TOKEN_STATE_SUSPENDED"
      TapAndPay.TOKEN_STATE_ACTIVE -> "TOKEN_STATE_ACTIVE"
      TapAndPay.TOKEN_STATE_FELICA_PENDING_PROVISIONING -> "TOKEN_STATE_FELICA_PENDING_PROVISIONING"
      TapAndPay.TOKEN_STATE_UNTOKENIZED -> "TOKEN_STATE_UNTOKENIZED"
      else -> "UNKNOWN"
    }
  }
}

class DefaultPushProvisioningProxy {
  fun beginPushProvisioning(
    activity: Activity,
    description: String,
    provider: EphemeralKeyProvider
  ) {
      PushProvisioningActivityStarter(
        activity,
        PushProvisioningActivityStarter.Args(description, provider, false)
      ).startForResult()
  }
}
