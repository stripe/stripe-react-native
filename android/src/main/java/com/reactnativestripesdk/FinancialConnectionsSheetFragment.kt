package com.reactnativestripesdk

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeFragment
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.mapFromFinancialConnectionsEvent
import com.reactnativestripesdk.utils.mapFromToken
import com.stripe.android.financialconnections.FinancialConnections
import com.stripe.android.financialconnections.FinancialConnectionsSheet
import com.stripe.android.financialconnections.FinancialConnectionsSheetForTokenResult
import com.stripe.android.financialconnections.FinancialConnectionsSheetResult
import com.stripe.android.financialconnections.model.Balance
import com.stripe.android.financialconnections.model.BalanceRefresh
import com.stripe.android.financialconnections.model.FinancialConnectionsAccount
import com.stripe.android.financialconnections.model.FinancialConnectionsAccountList
import com.stripe.android.financialconnections.model.FinancialConnectionsSession

class FinancialConnectionsSheetFragment : StripeFragment() {
  enum class Mode {
    ForToken,
    ForSession,
  }

  private lateinit var promise: Promise
  private lateinit var context: ReactApplicationContext
  private lateinit var configuration: FinancialConnectionsSheet.Configuration
  private lateinit var mode: Mode

  override fun prepare() {
    val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
    FinancialConnections.setEventListener { event ->
      val params = mapFromFinancialConnectionsEvent(event)
      stripeSdkModule?.emitOnFinancialConnectionsEvent(params)
    }

    when (mode) {
      Mode.ForToken -> {
        FinancialConnectionsSheet
          .createForBankAccountToken(
            this,
            ::onFinancialConnectionsSheetForTokenResult,
          ).present(configuration = configuration)
      }

      Mode.ForSession -> {
        FinancialConnectionsSheet
          .create(this, ::onFinancialConnectionsSheetForDataResult)
          .present(configuration = configuration)
      }
    }
  }

  override fun onDestroy() {
    super.onDestroy()

    // Remove any event listener that might be set
    FinancialConnections.clearEventListener()
  }

  private fun onFinancialConnectionsSheetForTokenResult(result: FinancialConnectionsSheetForTokenResult) {
    when (result) {
      is FinancialConnectionsSheetForTokenResult.Canceled -> {
        promise.resolve(createError(ErrorType.Canceled.toString(), "The flow has been canceled"))
      }

      is FinancialConnectionsSheetForTokenResult.Failed -> {
        promise.resolve(createError(ErrorType.Failed.toString(), result.error))
      }

      is FinancialConnectionsSheetForTokenResult.Completed -> {
        promise.resolve(createTokenResult(result))
        (context.currentActivity as? FragmentActivity)
          ?.supportFragmentManager
          ?.beginTransaction()
          ?.remove(this)
          ?.commitAllowingStateLoss()
      }
    }
  }

  private fun onFinancialConnectionsSheetForDataResult(result: FinancialConnectionsSheetResult) {
    when (result) {
      is FinancialConnectionsSheetResult.Canceled -> {
        promise.resolve(createError(ErrorType.Canceled.toString(), "The flow has been canceled"))
      }

      is FinancialConnectionsSheetResult.Failed -> {
        promise.resolve(createError(ErrorType.Failed.toString(), result.error))
      }

      is FinancialConnectionsSheetResult.Completed -> {
        promise.resolve(
          WritableNativeMap().also {
            it.putMap("session", mapFromSession(result.financialConnectionsSession))
          },
        )
        (context.currentActivity as? FragmentActivity)
          ?.supportFragmentManager
          ?.beginTransaction()
          ?.remove(this)
          ?.commitAllowingStateLoss()
      }
    }
  }

  fun presentFinancialConnectionsSheet(
    clientSecret: String,
    mode: Mode,
    publishableKey: String,
    stripeAccountId: String?,
    promise: Promise,
    context: ReactApplicationContext,
  ) {
    this.promise = promise
    this.context = context
    this.mode = mode
    this.configuration =
      FinancialConnectionsSheet.Configuration(
        financialConnectionsSessionClientSecret = clientSecret,
        publishableKey = publishableKey,
        stripeAccountId = stripeAccountId,
      )

    (context.currentActivity as? FragmentActivity)?.let {
      attemptToCleanupPreviousFragment(it)
      commitFragmentAndStartFlow(it)
    }
      ?: run {
        promise.resolve(createMissingActivityError())
        return
      }
  }

  private fun attemptToCleanupPreviousFragment(currentActivity: FragmentActivity) {
    currentActivity.supportFragmentManager
      .beginTransaction()
      .remove(this)
      .commitAllowingStateLoss()
  }

  private fun commitFragmentAndStartFlow(currentActivity: FragmentActivity) {
    try {
      currentActivity.supportFragmentManager
        .beginTransaction()
        .add(this, TAG)
        .commit()
    } catch (error: IllegalStateException) {
      promise.resolve(createError(ErrorType.Failed.toString(), error.message))
    }
  }

  companion object {
    internal const val TAG = "financial_connections_sheet_launch_fragment"

    private fun createTokenResult(result: FinancialConnectionsSheetForTokenResult.Completed): WritableMap =
      WritableNativeMap().also {
        it.putMap("session", mapFromSession(result.financialConnectionsSession))
        it.putMap("token", mapFromToken(result.token))
      }

    private fun mapFromSession(financialConnectionsSession: FinancialConnectionsSession): WritableMap {
      val session = WritableNativeMap()
      session.putString("id", financialConnectionsSession.id)
      session.putString("clientSecret", financialConnectionsSession.clientSecret)
      session.putBoolean("livemode", financialConnectionsSession.livemode)
      session.putArray("accounts", mapFromAccountsList(financialConnectionsSession.accounts))
      return session
    }

    private fun mapFromAccountsList(accounts: FinancialConnectionsAccountList): ReadableArray {
      val results: WritableArray = Arguments.createArray()
      for (account in accounts.data) {
        val map = WritableNativeMap()
        map.putString("id", account.id)
        map.putBoolean("livemode", account.livemode)
        map.putString("displayName", account.displayName)
        map.putString("status", mapFromStatus(account.status))
        map.putString("institutionName", account.institutionName)
        map.putString("last4", account.last4)
        map.putDouble("created", account.created * 1000.0)
        map.putMap("balance", mapFromAccountBalance(account.balance))
        map.putMap("balanceRefresh", mapFromAccountBalanceRefresh(account.balanceRefresh))
        map.putString("category", mapFromCategory(account.category))
        map.putString("subcategory", mapFromSubcategory(account.subcategory))
        map.putArray(
          "permissions",
          (account.permissions?.map { permission -> mapFromPermission(permission) })
            ?.toReadableArray(),
        )
        map.putArray(
          "supportedPaymentMethodTypes",
          (
            account.supportedPaymentMethodTypes.map { type ->
              mapFromSupportedPaymentMethodTypes(type)
            }
          ).toReadableArray(),
        )
        results.pushMap(map)
      }
      return results
    }

    private fun mapFromAccountBalance(balance: Balance?): WritableMap? {
      if (balance == null) {
        return null
      }
      val map = WritableNativeMap()
      map.putDouble("asOf", balance.asOf * 1000.0)
      map.putString("type", mapFromBalanceType(balance.type))
      WritableNativeMap().also {
        for (entry in balance.current.entries) {
          it.putInt(entry.key, entry.value)
        }
        map.putMap("current", it)
      }
      map.putMap("cash", mapFromCashAvailable(balance))
      map.putMap("credit", mapFromCreditUsed(balance))

      return map
    }

    private fun mapFromCashAvailable(balance: Balance): WritableNativeMap =
      WritableNativeMap().also { cashMap ->
        WritableNativeMap().also { availableMap ->
          balance.cash?.available?.entries?.let { entries ->
            for (entry in entries) {
              availableMap.putInt(entry.key, entry.value)
            }
          }
          cashMap.putMap("available", availableMap)
        }
      }

    private fun mapFromCreditUsed(balance: Balance): WritableNativeMap =
      WritableNativeMap().also { creditMap ->
        WritableNativeMap().also { usedMap ->
          balance.credit?.used?.entries?.let { entries ->
            for (entry in entries) {
              usedMap.putInt(entry.key, entry.value)
            }
          }
          creditMap.putMap("used", usedMap)
        }
      }

    private fun mapFromAccountBalanceRefresh(balanceRefresh: BalanceRefresh?): WritableMap? {
      if (balanceRefresh == null) {
        return null
      }
      val map = WritableNativeMap()
      map.putString("status", mapFromBalanceRefreshStatus(balanceRefresh.status))
      map.putDouble("lastAttemptedAt", balanceRefresh.lastAttemptedAt * 1000.0)
      return map
    }

    private fun mapFromStatus(status: FinancialConnectionsAccount.Status): String =
      when (status) {
        FinancialConnectionsAccount.Status.ACTIVE -> "active"
        FinancialConnectionsAccount.Status.DISCONNECTED -> "disconnected"
        FinancialConnectionsAccount.Status.INACTIVE -> "inactive"
        FinancialConnectionsAccount.Status.UNKNOWN -> "unparsable"
      }

    private fun mapFromCategory(category: FinancialConnectionsAccount.Category): String =
      when (category) {
        FinancialConnectionsAccount.Category.CASH -> "cash"
        FinancialConnectionsAccount.Category.CREDIT -> "credit"
        FinancialConnectionsAccount.Category.INVESTMENT -> "investment"
        FinancialConnectionsAccount.Category.OTHER -> "other"
        FinancialConnectionsAccount.Category.UNKNOWN -> "unparsable"
      }

    private fun mapFromSubcategory(subcategory: FinancialConnectionsAccount.Subcategory): String =
      when (subcategory) {
        FinancialConnectionsAccount.Subcategory.CHECKING -> "checking"
        FinancialConnectionsAccount.Subcategory.CREDIT_CARD -> "creditCard"
        FinancialConnectionsAccount.Subcategory.LINE_OF_CREDIT -> "lineOfCredit"
        FinancialConnectionsAccount.Subcategory.MORTGAGE -> "mortgage"
        FinancialConnectionsAccount.Subcategory.OTHER -> "other"
        FinancialConnectionsAccount.Subcategory.SAVINGS -> "savings"
        FinancialConnectionsAccount.Subcategory.UNKNOWN -> "unparsable"
      }

    private fun mapFromPermission(permission: FinancialConnectionsAccount.Permissions): String =
      when (permission) {
        FinancialConnectionsAccount.Permissions.PAYMENT_METHOD -> "paymentMethod"
        FinancialConnectionsAccount.Permissions.BALANCES -> "balances"
        FinancialConnectionsAccount.Permissions.OWNERSHIP -> "ownership"
        FinancialConnectionsAccount.Permissions.TRANSACTIONS -> "transactions"
        FinancialConnectionsAccount.Permissions.ACCOUNT_NUMBERS -> "accountNumbers"
        FinancialConnectionsAccount.Permissions.UNKNOWN -> "unparsable"
        FinancialConnectionsAccount.Permissions.ACCOUNT_NUMBERS -> "accountNumbers"
      }

    private fun mapFromSupportedPaymentMethodTypes(type: FinancialConnectionsAccount.SupportedPaymentMethodTypes): String =
      when (type) {
        FinancialConnectionsAccount.SupportedPaymentMethodTypes.US_BANK_ACCOUNT -> "usBankAccount"
        FinancialConnectionsAccount.SupportedPaymentMethodTypes.LINK -> "link"
        FinancialConnectionsAccount.SupportedPaymentMethodTypes.UNKNOWN -> "unparsable"
      }

    private fun mapFromBalanceType(type: Balance.Type): String =
      when (type) {
        Balance.Type.CASH -> "cash"
        Balance.Type.CREDIT -> "credit"
        Balance.Type.UNKNOWN -> "unparsable"
      }

    private fun mapFromBalanceRefreshStatus(status: BalanceRefresh.BalanceRefreshStatus?): String =
      when (status) {
        BalanceRefresh.BalanceRefreshStatus.SUCCEEDED -> "succeeded"
        BalanceRefresh.BalanceRefreshStatus.FAILED -> "failed"
        BalanceRefresh.BalanceRefreshStatus.PENDING -> "pending"
        BalanceRefresh.BalanceRefreshStatus.UNKNOWN -> "unparsable"
        null -> "null"
      }
  }
}

fun List<String>.toReadableArray(): ReadableArray {
  val results: WritableArray = Arguments.createArray()
  for (s in this) {
    results.pushString(s)
  }
  return results
}
