package com.reactnativestripesdk.pushprovisioning

import android.app.Activity
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.reactnativestripesdk.createError
import com.google.android.gms.tasks.Task

object TapAndPayProxy {
  private const val TAG = "StripeTapAndPay"
  private var tapAndPayClient: Any? = null
  const val REQUEST_CODE_TOKENIZE = 90909

  fun invoke(activity: Activity, newCardLastFour: String, promise: Promise) {
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      val getClientMethod = tapAndPayClass.getMethod("getClient", Activity::class.java)

      tapAndPayClient = getClientMethod.invoke(null, activity).also {
        val tapAndPayClientClass = Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")
        val listTokensMethod = tapAndPayClientClass.getMethod("listTokens")

        val tokens = listTokensMethod.invoke(it) as Task<List<Any>>
        tokens.addOnCompleteListener { task ->
          if (task.isSuccessful) {
            for (token in task.result) {
              try {
                val getFpanLastFourMethod = Class.forName("com.google.android.gms.tapandpay.issuer.TokenInfo").getMethod("getFpanLastFour")
                val existingFpanLastFour = getFpanLastFourMethod.invoke(token) as String
                if (existingFpanLastFour == newCardLastFour) {
                  promise.resolve(
                    createResult(
                      true,
                      token))
                  return@addOnCompleteListener
                }
              } catch (err: Exception) {
                Log.e(TAG, "There was a problem finding the class com.google.android.gms.tapandpay.issuer.TokenInfo. Make sure you've included Google's TapAndPay dependency.")
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

  fun tokenize(activity: Activity, tokenReferenceId: String, token: ReadableMap, cardDescription: String) {
    try {
      val tapAndPayClientClass = Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")
      val tokenizeMethod = tapAndPayClientClass::class.java.getMethod("tokenize", Activity::class.java, String::class.java, Int::class.java, String::class.java, Int::class.java, Int::class.java)
      tokenizeMethod.invoke(tapAndPayClient,
                            activity,
                            tokenReferenceId,
                            token.getInt("serviceProvider"),
                            cardDescription,
                            token.getInt("network"),
                            REQUEST_CODE_TOKENIZE)
    } catch (e: Exception) {
      Log.e(TAG, "Google TapAndPay dependency not found.")
    }
  }

  private fun createResult(cardIsInWallet: Boolean, token: Any? = null): WritableMap {
    val result = WritableNativeMap()
    result.putBoolean("isInWallet", cardIsInWallet)
    result.putMap("token", mapFromTokenInfo(token))
    return result
  }

  private fun mapFromTokenInfo(token: Any?): WritableMap? {
    if (token == null) {
      return null
    }
    val result = WritableNativeMap()
    try {
      val tokenInfoClass = Class.forName("com.google.android.gms.tapandpay.issuer.TokenInfo")
      result.putString(
        "id",
        tokenInfoClass.getMethod("getIssuerTokenId").invoke(token) as String)
      result.putString(
        "cardLastFour",
        tokenInfoClass.getMethod("getFpanLastFour").invoke(token) as String)
      result.putString(
        "issuer",
        tokenInfoClass.getMethod("getIssuerName").invoke(token) as String)
      result.putString(
        "status",
        mapFromTokenState(tokenInfoClass.getMethod("getTokenState").invoke(token) as Int))
      result.putInt(
        "network",
        tokenInfoClass.getMethod("getNetwork").invoke(token) as Int)
      result.putInt(
        "serviceProvider",
        tokenInfoClass.getMethod("getTokenServiceProvider").invoke(token) as Int)
    } catch (e: Exception) {
      Log.e(TAG,
            "There was a problem finding the class com.google.android.gms.tapandpay.issuer.TokenInfo. Make sure you've included Google's TapAndPay dependency.")
    }
    return result
  }

  private fun mapFromTokenState(status: Int): String {
    return when (status) {
      getTokenState("TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION") -> "TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION"
      getTokenState("TOKEN_STATE_PENDING") -> "TOKEN_STATE_PENDING"
      getTokenState("TOKEN_STATE_SUSPENDED") -> "TOKEN_STATE_SUSPENDED"
      getTokenState("TOKEN_STATE_ACTIVE") -> "TOKEN_STATE_ACTIVE"
      getTokenState("TOKEN_STATE_FELICA_PENDING_PROVISIONING") -> "TOKEN_STATE_FELICA_PENDING_PROVISIONING"
      getTokenState("TOKEN_STATE_UNTOKENIZED") -> "TOKEN_STATE_UNTOKENIZED"
      else -> "UNKNOWN"
    }
  }

  private fun getTokenState(state: String): Int? {
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      return tapAndPayClass.getField(state) as Int
    } catch (e: Exception) {
      Log.e(TAG,
            "There was a problem finding the class com.google.android.gms.tapandpay.TapAndPay.$state. Make sure you've included Google's TapAndPay dependency.")
      return null
    }
  }
}
