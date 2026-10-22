package com.reactnativestripesdk

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ConnectFinancialConnectionsOperationGateTest {
  @Test
  fun laterOperationWaitsForTheActivePresentationToComplete() {
    val gate = ConnectFinancialConnectionsOperationGate()

    assertTrue(gate.begin("connect-a"))
    assertFalse(gate.begin("connect-b"))
    gate.finish("connect-b")
    assertFalse(gate.begin("connect-b"))

    gate.finish("connect-a")
    assertTrue(gate.begin("connect-b"))
  }
}
