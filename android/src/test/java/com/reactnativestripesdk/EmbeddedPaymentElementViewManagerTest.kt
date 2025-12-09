package com.reactnativestripesdk

import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class EmbeddedPaymentElementViewManagerTest {
  // ============================================
  // mapToRowSelectionBehaviorType Tests
  // ============================================

  @Test
  fun mapToRowSelectionBehaviorType_NullMap_DefaultsToDefault() {
    val result = mapToRowSelectionBehaviorType(null)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_EmptyMap_DefaultsToDefault() {
    val params = readableMapOf()
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_NoRowSelectionBehaviorKey_DefaultsToDefault() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_TypeDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "default",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_TypeImmediateAction() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "immediateAction",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.ImmediateAction, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_InvalidType_DefaultsToDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "invalid",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_NullType_DefaultsToDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to readableMapOf(),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  // ============================================
  // mapToFormSheetAction Tests
  // ============================================

  @Test
  fun mapToFormSheetAction_NullMap_DefaultsToContinue() {
    val result = mapToFormSheetAction(null)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_EmptyMap_DefaultsToContinue() {
    val params = readableMapOf()
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_NoFormSheetActionKey_DefaultsToContinue() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_TypeContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "continue",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_TypeConfirm() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "confirm",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Confirm, result)
  }

  @Test
  fun mapToFormSheetAction_InvalidType_DefaultsToContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "invalid",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_NullType_DefaultsToContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to readableMapOf(),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }
}
