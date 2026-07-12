package com.reactnativestripesdk.pushprovisioning

import android.app.Activity
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.tasks.Task
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getIntOr

typealias TokenCheckHandler =
  (isCardInWallet: Boolean, token: WritableMap?, error: WritableMap?) -> Unit

typealias EligibilityCheckHandler = (canAdd: Boolean, token: WritableMap?, error: WritableMap?) -> Unit

object TapAndPayProxy {
  private const val TAG = "StripeTapAndPay"
  private var tapAndPayClient: Any? = null
  const val REQUEST_CODE_TOKENIZE = 90909
  private const val FALLBACK_MASTERCARD_CONSTANT = 3
  private const val FALLBACK_VISA_CONSTANT = 4

  private fun getTapandPayTokens(activity: Activity): Task<List<Any>>? =
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      val getClientMethod = tapAndPayClass.getMethod("getClient", Activity::class.java)
      val client = getClientMethod.invoke(null, activity)

      val tapAndPayClientClass = Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")
      val listTokensMethod = tapAndPayClientClass.getMethod("listTokens")

      @Suppress("UNCHECKED_CAST")
      listTokensMethod.invoke(client) as Task<List<Any>>
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem listing tokens with Google TapAndPay: " + e.message)
      null
    }

  internal fun isTokenInWallet(
    token: Any,
    newLastFour: String,
  ): Boolean =
    try {
      val getFpanLastFourMethod =
        Class
          .forName("com.google.android.gms.tapandpay.issuer.TokenInfo")
          .getMethod("getFpanLastFour")
      val existingFpanLastFour = getFpanLastFourMethod.invoke(token) as String
      existingFpanLastFour == newLastFour
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem getting the FPAN with Google TapAndPay: " + e.message)
      false
    }

  fun findExistingToken(
    activity: Activity,
    newCardLastFour: String,
    callback: TokenCheckHandler,
  ) {
    val tokens = getTapandPayTokens(activity)
    if (tokens == null) {
      callback(false, null, createError("Failed", "Google TapAndPay dependency not found."))
      return
    }

    tokens.addOnCompleteListener { task ->
      if (task.isSuccessful) {
        for (token in task.result) {
          if (isTokenInWallet(token, newCardLastFour)) {
            callback(true, mapFromTokenInfo(token), null)
            return@addOnCompleteListener
          }
        }
      } else {
        Log.e(TAG, "Unable to fetch existing tokens from Google TapAndPay.")
      }
      callback(false, null, null)
    }
  }

  fun checkEligibility(
    activity: Activity,
    cardLastFour: String,
    cardBrand: String,
    callback: EligibilityCheckHandler,
  ) {
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      val getClientMethod = tapAndPayClass.getMethod("getClient", Activity::class.java)
      val client = getClientMethod.invoke(null, activity)

      val (network, tokenServiceProvider) = mapBrandToConstants(cardBrand)
      val builderClass =
        Class.forName(
          "com.google.android.gms.tapandpay.issuer.HasEligibleTokenizationTargetRequest\$Builder"
        )
      val builder = builderClass.getDeclaredConstructor().newInstance()
      builderClass.getMethod("setIdentifier", String::class.java).invoke(builder, cardLastFour)
      builderClass.getMethod("setNetwork", Int::class.java).invoke(builder, network)
      builderClass.getMethod("setTokenServiceProvider", Int::class.java).invoke(builder, tokenServiceProvider)
      builderClass.getMethod("setIssuerName", String::class.java).invoke(builder, "Stripe")
      val request = builderClass.getMethod("build").invoke(builder)

      val requestClass = Class.forName("com.google.android.gms.tapandpay.issuer.HasEligibleTokenizationTargetRequest")
      val tapAndPayClientClass = Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")
      val method = tapAndPayClientClass.getMethod("hasEligibleTokenizationTarget", requestClass)

      @Suppress("UNCHECKED_CAST")
      val task = method.invoke(client, request) as Task<Boolean>
      task.addOnCompleteListener { completedTask ->
        if (completedTask.isSuccessful) {
          val hasTarget = completedTask.result
          findExistingToken(activity, cardLastFour) { _, token, _ ->
            callback(hasTarget, token, null)
          }
        } else {
          Log.w(
            TAG,
            "hasEligibleTokenizationTarget failed, falling back to listTokens: " + completedTask.exception,
          )
          fallbackToListTokens(activity, cardLastFour, callback)
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem calling hasEligibleTokenizationTarget with Google TapAndPay: " + e.message)
      fallbackToListTokens(activity, cardLastFour, callback)
    }
  }

  private fun fallbackToListTokens(
    activity: Activity,
    cardLastFour: String,
    callback: EligibilityCheckHandler,
  ) {
    findExistingToken(activity, cardLastFour) { isInWallet, token, error ->
      if (error != null) {
        callback(false, null, error)
      } else {
        callback(!isInWallet, token, null)
      }
    }
  }

  private fun mapBrandToConstants(cardBrand: String): Pair<Int, Int> {
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      return if (cardBrand.lowercase() == "mastercard") {
        Pair(
          tapAndPayClass.getField("CARD_NETWORK_MASTERCARD").getInt(null),
          tapAndPayClass.getField("TOKEN_PROVIDER_MASTERCARD").getInt(null),
        )
      } else {
        Pair(
          tapAndPayClass.getField("CARD_NETWORK_VISA").getInt(null),
          tapAndPayClass.getField("TOKEN_PROVIDER_VISA").getInt(null),
        )
      }
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem getting TapAndPay constants: " + e.message)
      return if (cardBrand.lowercase() == "mastercard") {
        Pair(FALLBACK_MASTERCARD_CONSTANT, FALLBACK_MASTERCARD_CONSTANT)
      } else {
        Pair(FALLBACK_VISA_CONSTANT, FALLBACK_VISA_CONSTANT)
      }
    }
  }

  fun tokenize(
    activity: Activity,
    tokenReferenceId: String,
    token: ReadableMap,
    cardDescription: String,
  ) {
    try {
      val tapAndPayClientClass = Class.forName("com.google.android.gms.tapandpay.TapAndPayClient")
      val tokenizeMethod =
        tapAndPayClientClass::class
          .java
          .getMethod(
            "tokenize",
            Activity::class.java,
            String::class.java,
            Int::class.java,
            String::class.java,
            Int::class.java,
            Int::class.java,
          )
      tokenizeMethod.invoke(
        tapAndPayClient,
        activity,
        tokenReferenceId,
        token.getIntOr("serviceProvider", 0),
        cardDescription,
        token.getIntOr("network", 0),
        REQUEST_CODE_TOKENIZE,
      )
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem tokenizing with Google TapAndPay: " + e.message)
    }
  }

  private fun mapFromTokenInfo(token: Any?): WritableMap {
    val result = Arguments.createMap()
    token?.let {
      try {
        val tokenInfoClass = Class.forName("com.google.android.gms.tapandpay.issuer.TokenInfo")
        result.putString("id", tokenInfoClass.getMethod("getIssuerTokenId").invoke(it) as String)
        val fpan = tokenInfoClass.getMethod("getFpanLastFour").invoke(it) as String
        result.putString("cardLastFour", fpan)
        result.putString("fpanLastFour", fpan)
        result.putString(
          "dpanLastFour",
          tokenInfoClass.getMethod("getDpanLastFour").invoke(it) as String,
        )
        result.putString("issuer", tokenInfoClass.getMethod("getIssuerName").invoke(it) as String)
        result.putString(
          "status",
          mapFromTokenState(tokenInfoClass.getMethod("getTokenState").invoke(it) as Int),
        )
        result.putInt("network", tokenInfoClass.getMethod("getNetwork").invoke(it) as Int)
        result.putInt(
          "serviceProvider",
          tokenInfoClass.getMethod("getTokenServiceProvider").invoke(it) as Int,
        )
      } catch (e: Exception) {
        Log.e(
          TAG,
          "There was a problem mapping the token information with Google TapAndPay: " + e.message,
        )
      }
    }
    return result
  }

  private fun mapFromTokenState(status: Int): String {
    try {
      val tapAndPayClass = Class.forName("com.google.android.gms.tapandpay.TapAndPay")
      return when (status) {
        tapAndPayClass.getField("TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION").get(tapAndPayClass) ->
          "TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION"
        tapAndPayClass.getField("TOKEN_STATE_PENDING").get(tapAndPayClass) -> "TOKEN_STATE_PENDING"
        tapAndPayClass.getField("TOKEN_STATE_SUSPENDED").get(tapAndPayClass) ->
          "TOKEN_STATE_SUSPENDED"
        tapAndPayClass.getField("TOKEN_STATE_ACTIVE").get(tapAndPayClass) -> "TOKEN_STATE_ACTIVE"
        tapAndPayClass.getField("TOKEN_STATE_FELICA_PENDING_PROVISIONING").get(tapAndPayClass) ->
          "TOKEN_STATE_FELICA_PENDING_PROVISIONING"
        tapAndPayClass.getField("TOKEN_STATE_UNTOKENIZED").get(tapAndPayClass) ->
          "TOKEN_STATE_UNTOKENIZED"
        else -> "UNKNOWN"
      }
    } catch (e: Exception) {
      Log.e(TAG, "There was a problem mapping the token state with Google TapAndPay: " + e.message)
      return "UNKNOWN"
    }
  }
}
