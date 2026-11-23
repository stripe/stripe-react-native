package com.reactnativestripesdk.connect

import java.net.URI
import java.net.URLDecoder
import kotlin.math.ceil

/**
 * Decides which windows an inline Connect component may show as sheets, and validates what Connect.js reports about
 * them.
 */
internal object ConnectInlineSheetRules {
  const val MAX_HEIGHT = 10000

  private val SHEET_ID = Regex("^[A-Za-z0-9-]{1,64}$")
  private val ACCESSORY_LAYER_PATH = Regex("^/accessory_layer_[A-Za-z0-9]+\\.html$")

  /**
   * Returns the sheet id for a window URL Connect.js opens for a sheet, e.g.
   * `https://connect-js.stripe.com/accessory_layer_<hash>.html#layer_type=overlay&os_sheet=true&os_sheet_id=<id>`,
   * or null if the window isn't one.
   */
  fun sheetIdForWindowUrl(
    url: String?,
    connectJsOrigin: String?,
  ): String? {
    val uri = url?.let { runCatching { URI(it) }.getOrNull() } ?: return null
    val origin = connectJsOrigin?.let { runCatching { URI(it) }.getOrNull() } ?: return null
    val path = uri.rawPath
    val fragment = uri.rawFragment
    val isAccessoryLayerPage =
      isSameOrigin(uri.scheme, uri.host, uri.port, origin) &&
        uri.rawUserInfo == null &&
        uri.rawQuery == null &&
        path != null &&
        ACCESSORY_LAYER_PATH.matches(path)
    if (!isAccessoryLayerPage || fragment == null) return null
    val params = uniqueParams(fragment) ?: return null
    if (params["os_sheet"] != "true") return null
    return params["os_sheet_id"]?.takeIf { isValidSheetId(it) }
  }

  sealed class WindowDecision {
    data class Sheet(
      val sheetId: String,
    ) : WindowDecision()

    object OpenOutside : WindowDecision()

    object Drop : WindowDecision()
  }

  /**
   * Android doesn't say which frame opened a window, so a sheet is shown only once Connect.js reports on it from the
   * component's page. Other windows open outside the app only when the user opened them.
   */
  fun decideWindow(
    url: String,
    isUserGesture: Boolean,
    connectJsOrigin: String?,
  ): WindowDecision {
    val sheetId = sheetIdForWindowUrl(url, connectJsOrigin)
    return when {
      sheetId != null -> WindowDecision.Sheet(sheetId)
      isUserGesture -> WindowDecision.OpenOutside
      else -> WindowDecision.Drop
    }
  }

  enum class NavigationDecision {
    ALLOW,
    BLOCK,
    BLOCK_AND_OPEN_OUTSIDE,
  }

  /**
   * After its first page, a sheet allows only changes within that page, and opens the links the user taps outside
   * the app.
   */
  fun decideLaterSheetNavigation(
    url: String,
    windowUrl: String,
    hasGesture: Boolean,
  ): NavigationDecision =
    when {
      url.substringBefore("#") == windowUrl.substringBefore("#") -> NavigationDecision.ALLOW
      hasGesture -> NavigationDecision.BLOCK_AND_OPEN_OUTSIDE
      else -> NavigationDecision.BLOCK
    }

  fun isValidSheetId(sheetId: String): Boolean = SHEET_ID.matches(sheetId)

  fun clampHeight(height: Double): Int? {
    if (height.isNaN() || height.isInfinite()) return null
    return ceil(height).coerceIn(0.0, MAX_HEIGHT.toDouble()).toInt()
  }

  /** `port` is -1, as in [URI], for the scheme's default port. */
  fun isSameOrigin(
    scheme: String?,
    host: String?,
    port: Int,
    origin: URI,
  ): Boolean =
    scheme != null &&
      host != null &&
      scheme.equals(origin.scheme, ignoreCase = true) &&
      host.equals(origin.host, ignoreCase = true) &&
      port == origin.port

  /** Parses `a=1&b=2`, or returns null if a name repeats, since parsers disagree on which value wins. */
  private fun uniqueParams(encoded: String): Map<String, String>? {
    val params = mutableMapOf<String, String>()
    for (pair in encoded.split("&")) {
      val name = decode(pair.substringBefore("=")) ?: return null
      val value = decode(if (pair.contains("=")) pair.substringAfter("=") else "") ?: return null
      if (params.containsKey(name)) return null
      params[name] = value
    }
    return params
  }

  private fun decode(value: String): String? = runCatching { URLDecoder.decode(value, "UTF-8") }.getOrNull()
}

/**
 * Tracks each sheet from the window Connect.js opens to the window closing, and says what the sheet should do.
 *
 * A sheet appears after its first `sheetChanged`. A dismissible sheet goes away when the user dismisses it, and
 * Connect.js gets `sheetClosed`. For a sheet that isn't dismissible, Connect.js gets `sheetCloseRequested` and decides,
 * closing the window if the dialog closes.
 */
internal class ConnectInlineSheetLifecycle {
  enum class Phase {
    AWAITING_FIRST_CHANGE,
    SHOWN,
    GONE,
  }

  sealed class Action {
    data class Present(
      val sheetId: String,
      val height: Int,
      val dismissible: Boolean,
    ) : Action()

    data class Update(
      val sheetId: String,
      val height: Int,
      val dismissible: Boolean,
    ) : Action()

    data class Dismiss(
      val sheetId: String,
    ) : Action()

    data class SendSheetClosed(
      val sheetId: String,
    ) : Action()

    data class SendSheetCloseRequested(
      val sheetId: String,
    ) : Action()

    data class Release(
      val sheetId: String,
    ) : Action()
  }

  private val phases = mutableMapOf<String, Phase>()

  fun phase(sheetId: String): Phase? = phases[sheetId]

  /** Returns false for an id that's already open, so a second window can't take over its sheet. */
  fun windowOpened(sheetId: String): Boolean {
    if (phases.containsKey(sheetId)) return false
    phases[sheetId] = Phase.AWAITING_FIRST_CHANGE
    return true
  }

  fun sheetChanged(
    sheetId: String,
    height: Int,
    dismissible: Boolean,
  ): List<Action> =
    when (phases[sheetId]) {
      Phase.AWAITING_FIRST_CHANGE -> {
        phases[sheetId] = Phase.SHOWN
        listOf(Action.Present(sheetId, height, dismissible))
      }
      Phase.SHOWN -> listOf(Action.Update(sheetId, height, dismissible))
      Phase.GONE, null -> emptyList()
    }

  /** The user dismissed a dismissible sheet, or the sheet went away with the screen behind it. */
  fun sheetDismissed(sheetId: String): List<Action> {
    if (phases[sheetId] != Phase.SHOWN) return emptyList()
    phases[sheetId] = Phase.GONE
    return listOf(Action.SendSheetClosed(sheetId))
  }

  /** The user tried to dismiss a sheet that isn't dismissible. */
  fun closeRequested(sheetId: String): List<Action> =
    if (phases[sheetId] == Phase.SHOWN) listOf(Action.SendSheetCloseRequested(sheetId)) else emptyList()

  /** Connect.js called `window.close()`. */
  fun windowClosed(sheetId: String): List<Action> =
    when (phases.remove(sheetId)) {
      Phase.SHOWN -> listOf(Action.Dismiss(sheetId), Action.SendSheetClosed(sheetId), Action.Release(sheetId))
      Phase.AWAITING_FIRST_CHANGE, Phase.GONE -> listOf(Action.Release(sheetId))
      null -> emptyList()
    }

  /** The component loaded a new page or went away, so no sheet belongs to it anymore. */
  fun reset(): List<Action> {
    val actions =
      phases.keys.sorted().flatMap { sheetId ->
        if (phases[sheetId] == Phase.SHOWN) {
          listOf(Action.Dismiss(sheetId), Action.Release(sheetId))
        } else {
          listOf(Action.Release(sheetId))
        }
      }
    phases.clear()
    return actions
  }

  fun shownSheetIds(): List<String> = phases.filterValues { it == Phase.SHOWN }.keys.sorted()
}
