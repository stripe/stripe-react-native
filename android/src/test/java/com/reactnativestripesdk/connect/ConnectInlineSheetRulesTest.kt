package com.reactnativestripesdk.connect

import com.reactnativestripesdk.connect.ConnectInlineSheetLifecycle.Action
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ConnectInlineSheetRulesTest {
  private val origin = "https://connect-js.stripe.com"
  private val page = "https://connect-js.stripe.com/accessory_layer_3f9a.html"

  private fun shownLifecycle(dismissible: Boolean = true) =
    ConnectInlineSheetLifecycle().apply {
      windowOpened("sheet-1")
      sheetChanged("sheet-1", 300.0, dismissible)
    }

  @Test
  fun sheetId_acceptsAccessoryLayerSheetUrl() {
    assertEquals(
      "sheet-1",
      ConnectInlineSheetRules.sheetIdForWindowUrl("$page#layer_type=overlay&os_sheet=true&os_sheet_id=sheet-1", origin),
    )
  }

  @Test
  fun sheetId_rejectsLookalikeHost() {
    assertNull(
      ConnectInlineSheetRules.sheetIdForWindowUrl(
        "https://connect-js.stripe.com.evil.example/accessory_layer_3f9a.html#os_sheet=true&os_sheet_id=sheet-1",
        origin,
      ),
    )
  }

  @Test
  fun sheetId_rejectsRepeatedParameters() {
    val url = "$page#os_sheet=true&os_sheet_id=sheet-1&os_sheet_id=sheet-2"

    assertNull(ConnectInlineSheetRules.sheetIdForWindowUrl(url, origin))
  }

  @Test
  fun lifecycle_presentsOnlyAfterSheetChanged() {
    val lifecycle = ConnectInlineSheetLifecycle()
    lifecycle.windowOpened("sheet-1")

    assertEquals(listOf(Action.Present("sheet-1", 300.0, true)), lifecycle.sheetChanged("sheet-1", 300.0, true))
  }

  @Test
  fun lifecycle_dismissibleSheetSendsSheetClosedAndReleasesWhenDismissed() {
    val lifecycle = shownLifecycle()

    assertEquals(
      listOf(Action.SendSheetClosed("sheet-1"), Action.Release("sheet-1")),
      lifecycle.sheetDismissed("sheet-1"),
    )
    assertTrue(lifecycle.windowOpened("sheet-1"))
  }

  @Test
  fun lifecycle_nonDismissibleSheetSendsSheetCloseRequestedAndStays() {
    val lifecycle = shownLifecycle(dismissible = false)

    assertEquals(listOf(Action.SendSheetCloseRequested("sheet-1")), lifecycle.closeRequested("sheet-1"))
    assertEquals(listOf(Action.Update("sheet-1", 300.0, false)), lifecycle.sheetChanged("sheet-1", 300.0, false))
  }

  @Test
  fun lifecycle_windowCloseDismissesAndReleasesTheSheet() {
    val lifecycle = shownLifecycle()

    assertEquals(
      listOf(Action.Dismiss("sheet-1"), Action.SendSheetClosed("sheet-1"), Action.Release("sheet-1")),
      lifecycle.windowClosed("sheet-1"),
    )
  }

  @Test
  fun lifecycle_reloadTearsDownSheets() {
    val lifecycle = shownLifecycle()

    assertEquals(listOf(Action.Dismiss("sheet-1"), Action.Release("sheet-1")), lifecycle.reset())
    assertTrue(lifecycle.windowOpened("sheet-1"))
  }
}
