package com.reactnativestripesdk

import app.cash.turbine.Turbine
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap

internal class FakePromise : Promise {
  val resolveCalls = Turbine<ResolveCall>()
  val rejectCalls = Turbine<RejectCall>()

  override fun resolve(value: Any?) {
    resolveCalls.add(ResolveCall(value))
  }

  override fun reject(code: String, message: String?) {
    rejectCalls.add(RejectCall(code = code, message = message))
  }

  override fun reject(code: String, throwable: Throwable?) {
    rejectCalls.add(RejectCall(code = code, throwable = throwable))
  }

  override fun reject(code: String, message: String?, throwable: Throwable?) {
    rejectCalls.add(RejectCall(code = code, message = message, throwable = throwable))
  }

  override fun reject(throwable: Throwable) {
    rejectCalls.add(RejectCall(throwable = throwable))
  }

  override fun reject(throwable: Throwable, userInfo: WritableMap) {
    rejectCalls.add(RejectCall(throwable = throwable, userInfo = userInfo))
  }

  override fun reject(code: String, userInfo: WritableMap) {
    rejectCalls.add(RejectCall(code = code, userInfo = userInfo))
  }

  override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
    rejectCalls.add(RejectCall(code = code, throwable = throwable, userInfo = userInfo))
  }

  override fun reject(code: String, message: String?, userInfo: WritableMap) {
    rejectCalls.add(RejectCall(code = code, message = message, userInfo = userInfo))
  }

  override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
    rejectCalls.add(RejectCall(code = code, message = message, throwable = throwable, userInfo = userInfo))
  }

  @Deprecated("Use reject(code, message) instead.")
  override fun reject(message: String) {
    rejectCalls.add(RejectCall(message = message))
  }

  fun ensureAllEventsConsumed() {
    resolveCalls.ensureAllEventsConsumed()
    rejectCalls.ensureAllEventsConsumed()
  }

  data class ResolveCall(val value: Any?)

  data class RejectCall(
    val code: String? = null,
    val message: String? = null,
    val throwable: Throwable? = null,
    val userInfo: WritableMap? = null,
  )
}
