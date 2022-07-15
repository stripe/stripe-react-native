package com.reactnativestripesdk

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.*
import com.reactnativestripesdk.utils.*
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.mapFromToken
import com.stripe.android.financialconnections.FinancialConnectionsSheet
import com.stripe.android.financialconnections.FinancialConnectionsSheetForTokenResult
import com.stripe.android.financialconnections.model.Balance
import com.stripe.android.financialconnections.model.BalanceRefresh
import com.stripe.android.financialconnections.model.FinancialConnectionsAccountList

class FinancialConnectionsSheetFragment : Fragment() {
  private lateinit var promise: Promise
  private lateinit var context: ReactApplicationContext
  private lateinit var clientSecret: String
  private lateinit var publishableKey: String

  override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                            savedInstanceState: Bundle?): View {
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    FinancialConnectionsSheet.createForBankAccountToken(
      this,
      ::onFinancialConnectionsSheetForTokenResult
    ).present(
      configuration = FinancialConnectionsSheet.Configuration(
        financialConnectionsSessionClientSecret = clientSecret,
        publishableKey = publishableKey
      )
    )
  }

  private fun onFinancialConnectionsSheetForTokenResult(result: FinancialConnectionsSheetForTokenResult) {
    when(result) {
      is FinancialConnectionsSheetForTokenResult.Canceled -> {
        promise.resolve(
          createError(ErrorType.Canceled.toString(), "The flow has been canceled")
        )
      }
      is FinancialConnectionsSheetForTokenResult.Failed -> {
        promise.resolve(
          createError(ErrorType.Failed.toString(), result.error)
        )
      }
      is FinancialConnectionsSheetForTokenResult.Completed -> {
        promise.resolve(
          createResult("session", mapFromResult(result))
        )
        (context.currentActivity as? AppCompatActivity)?.supportFragmentManager?.beginTransaction()?.remove(this)?.commitAllowingStateLoss()
      }
    }
  }

  fun presentFinancialConnectionsSheet(clientSecret: String, publishableKey: String, promise: Promise, context: ReactApplicationContext) {
    this.promise = promise
    this.context = context
    this.clientSecret = clientSecret
    this.publishableKey = publishableKey

    (context.currentActivity as? AppCompatActivity)?.let {
      attemptToCleanupPreviousFragment(it)
      commitFragmentAndStartFlow(it)
    } ?: run {
      promise.resolve(createMissingActivityError())
      return
    }
  }

  private fun attemptToCleanupPreviousFragment(currentActivity: AppCompatActivity) {
    currentActivity.supportFragmentManager.beginTransaction()
      .remove(this)
      .commitAllowingStateLoss()
  }

  private fun commitFragmentAndStartFlow(currentActivity: AppCompatActivity) {
    try {
      currentActivity.supportFragmentManager.beginTransaction()
        .add(this, "financial_connections_sheet_launch_fragment")
        .commit()
    } catch (error: IllegalStateException) {
      promise.resolve(createError(ErrorType.Failed.toString(), error.message))
    }
  }

  private fun mapFromResult(result: FinancialConnectionsSheetForTokenResult.Completed): WritableMap {
    val map = WritableNativeMap()
    map.putString("id", result.financialConnectionsSession.id)
    map.putString("clientSecret", result.financialConnectionsSession.clientSecret)
    map.putBoolean("livemode", result.financialConnectionsSession.livemode)
    map.putMap("bankAccountToken", mapFromToken(result.token))
    map.putArray("accounts", mapFromAccountsList(result.financialConnectionsSession.accounts))
    return map
  }

  private fun mapFromAccountsList(accounts: FinancialConnectionsAccountList): ReadableArray {
    val results: WritableArray = Arguments.createArray()
    for (account in accounts.data) {
      val map = WritableNativeMap()
      map.putString("id", account.id)
      map.putBoolean("livemode", account.livemode)
      map.putString("displayName", account.displayName)
      map.putString("status", account.status.value)
      map.putString("institutionName", account.institutionName)
      map.putString("last4", account.last4)
      map.putInt("created", account.created)
      map.putMap("balance", mapFromAccountBalance(account.balance))
      map.putMap("balanceRefresh", mapFromAccountBalanceRefresh(account.balanceRefresh))
      map.putString("category", account.category.value)
      map.putString("subcategory", account.subcategory.value)
      map.putArray("permissions", (account.permissions?.map { permission -> permission.value })?.toReadableArray())
      map.putArray("supportedPaymentMethodTypes", (account.supportedPaymentMethodTypes.map { type -> type.value }).toReadableArray())
      results.pushMap(map)
    }
    return results
  }

  private fun mapFromAccountBalance(balance: Balance?): WritableMap? {
    if (balance == null) {
      return null
    }
    val map = WritableNativeMap()
    map.putInt("asOf", balance.asOf)
    map.putString("type", balance.type.value)
    map.putMap("current", balance.current as ReadableMap)
    map.putMap("cash", balance.cash?.available as ReadableMap)
    map.putMap("credit", balance.credit?.used as ReadableMap)
    return map
  }

  private fun mapFromAccountBalanceRefresh(balanceRefresh: BalanceRefresh?): WritableMap? {
    if (balanceRefresh == null) {
      return null
    }
    val map = WritableNativeMap()
    map.putString("status", balanceRefresh.status?.name) // TODO check if this is the correct or if we need raw value
    map.putInt("lastAttemptedAt", balanceRefresh.lastAttemptedAt)
    return map
  }
}

fun List<String>.toReadableArray(): ReadableArray {
  val results: WritableArray = Arguments.createArray()
  for (s in this) {
    results.pushString(s)
  }
  return results
}
