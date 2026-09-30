package com.reactnativestripesdk

import app.cash.turbine.Turbine

internal class FakeIntentCreationCallbackEmitter(
  private val onEmit: (String) -> Unit = {},
) : (String) -> Unit {
  val emitCalls = Turbine<EmitCall>()

  override fun invoke(requestId: String) {
    emitCalls.add(EmitCall(requestId))
    onEmit(requestId)
  }

  fun ensureAllEventsConsumed() {
    emitCalls.ensureAllEventsConsumed()
  }

  data class EmitCall(
    val requestId: String,
  )
}
