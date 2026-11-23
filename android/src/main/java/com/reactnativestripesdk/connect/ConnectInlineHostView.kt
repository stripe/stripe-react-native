package com.reactnativestripesdk.connect

import android.annotation.SuppressLint
import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.webkit.WebChromeClient
import android.webkit.WebView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup
import com.reactnativestripesdk.connect.ConnectInlineSheetLifecycle.Action
import org.json.JSONObject

/**
 * Hosts an inline Connect component's web view and presents the windows it opens as native sheets.
 *
 * react-native-webview creates a hidden web view for each new window and never shows it, so a window Connect.js opens
 * for a dialog would be lost. This wraps the web view's [WebChromeClient] to create sheet windows instead, and lets
 * only the component's own page message the SDK.
 */
@SuppressLint("ViewConstructor")
class ConnectInlineHostView(
  private val reactContext: ThemedReactContext,
) : ReactViewGroup(reactContext) {
  var connectJsOrigin: String? = null
  var sheetBackgroundColor: Int? = null

  private class Sheet(
    val webView: ConnectInlineSheetWebView,
    var dialog: ConnectInlineSheetDialog? = null,
  )

  private var webView: WebView? = null
  private var chromeClient: ConnectInlineChromeClient? = null
  private var didReportAttach = false
  private var didFailToAttach = false
  private var isDetached = false
  private val lifecycle = ConnectInlineSheetLifecycle()
  private val sheets = mutableMapOf<String, Sheet>()
  private val ensureAttachedOnDraw =
    ViewTreeObserver.OnPreDrawListener {
      ensureAttached()
      true
    }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnPreDrawListener(ensureAttachedOnDraw)
    post { ensureAttached() }
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnPreDrawListener(ensureAttachedOnDraw)
    // A dialog belongs to the activity, so it would otherwise stay over whatever screen replaces this one.
    lifecycle.shownSheetIds().forEach { perform(listOf(Action.Dismiss(it)) + lifecycle.sheetDismissed(it)) }
    super.onDetachedFromWindow()
  }

  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    post { ensureAttached() }
  }

  fun detach() {
    isDetached = true
    resetSheets()
  }

  fun resetSheets() {
    perform(lifecycle.reset())
  }

  fun onSheetChanged(
    sheetId: String,
    height: Int,
    dismissible: Boolean,
  ) {
    val clampedHeight = ConnectInlineSheetRules.clampHeight(height.toDouble())
    if (!ConnectInlineSheetRules.isValidSheetId(sheetId) || clampedHeight == null) return
    perform(lifecycle.sheetChanged(sheetId, clampedHeight, dismissible))
  }

  // Attaching

  private fun ensureAttached() {
    if (isDetached || didFailToAttach) return
    val found = findWebView(this) ?: return
    val origin = connectJsOrigin ?: return
    if (found !== webView) {
      if (!ConnectInlineMessageFilter.install(found, origin)) return failToAttach()
      webView = found
      chromeClient = null
    }
    // react-native-webview replaces its client when some props change, so this runs before every draw.
    if (!isChromeClientWrapped(found) && !wrapChromeClient(found)) return failToAttach()
    reportAttach(true)
  }

  private fun failToAttach() {
    didFailToAttach = true
    reportAttach(false)
  }

  private fun reportAttach(attached: Boolean) {
    if (didReportAttach) return
    didReportAttach = true
    dispatch(EVENT_ATTACH, Arguments.createMap().apply { putBoolean("attached", attached) })
  }

  private fun isChromeClientWrapped(webView: WebView): Boolean {
    val proxy = chromeClient ?: return false
    return libraryChromeClient(webView) === proxy.delegate
  }

  /**
   * react-native-webview keeps its own reference to its client and casts it back to its own type when props change,
   * so the web view gets the proxy while that reference keeps pointing at the library's client.
   */
  private fun wrapChromeClient(webView: WebView): Boolean {
    val field = libraryChromeClientField(webView) ?: return false
    return runCatching {
      val original = field.get(webView) as? WebChromeClient ?: WebChromeClient()
      val proxy = ConnectInlineChromeClient(original) { isUserGesture -> createWindow(webView, isUserGesture) }
      webView.webChromeClient = proxy
      field.set(webView, original)
      chromeClient = proxy
      true
    }.getOrDefault(false)
  }

  private fun libraryChromeClient(webView: WebView): Any? =
    libraryChromeClientField(webView)?.let { runCatching { it.get(webView) }.getOrNull() }

  private fun libraryChromeClientField(webView: WebView): java.lang.reflect.Field? {
    var type: Class<*>? = webView.javaClass
    while (type != null && type != WebView::class.java) {
      val field = runCatching { type.getDeclaredField(LIBRARY_CHROME_CLIENT_FIELD) }.getOrNull()
      if (field != null && WebChromeClient::class.java.isAssignableFrom(field.type)) {
        return runCatching { field.apply { isAccessible = true } }.getOrNull()
      }
      type = type.superclass
    }
    return null
  }

  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (index in 0 until view.childCount) {
        findWebView(view.getChildAt(index))?.let { return it }
      }
    }
    return null
  }

  // Windows

  private fun createWindow(
    opener: WebView,
    isUserGesture: Boolean,
  ): WebView? {
    if (isDetached || reactContext.currentActivity == null) return null
    return ConnectInlineSheetWebView(context, opener.settings.userAgentString, isUserGesture, windowListener)
  }

  private val windowListener =
    object : ConnectInlineSheetWebView.Listener {
      override fun onWindowOpened(
        window: ConnectInlineSheetWebView,
        url: String,
      ): Boolean {
        val decision = ConnectInlineSheetRules.decideWindow(url, window.isUserGesture, connectJsOrigin)
        if (decision is ConnectInlineSheetRules.WindowDecision.Sheet && !isDetached &&
          lifecycle.windowOpened(decision.sheetId)
        ) {
          val sheetId = decision.sheetId
          window.sheetId = sheetId
          sheets[sheetId] = Sheet(window)
          stage(window)
          return true
        }
        if (decision is ConnectInlineSheetRules.WindowDecision.OpenOutside) onOpenUrl(url)
        post { window.destroy() }
        return false
      }

      override fun onOpenUrl(url: String) {
        dispatch(EVENT_OPEN_URL, Arguments.createMap().apply { putString("url", url) })
      }

      override fun onWindowClosed(window: ConnectInlineSheetWebView) {
        val sheetId = window.sheetId
        if (sheetId == null || sheets[sheetId]?.webView !== window) {
          post { window.destroy() }
          return
        }
        perform(lifecycle.windowClosed(sheetId))
      }
    }

  /** Lays the window out behind the app's content at full width, so it renders before its sheet appears. */
  private fun stage(window: ConnectInlineSheetWebView) {
    val root = reactContext.currentActivity?.window?.decorView as? ViewGroup ?: return
    window.isStaged = true
    val matchParent = ViewGroup.LayoutParams.MATCH_PARENT
    root.addView(window, 0, ViewGroup.LayoutParams(matchParent, matchParent))
  }

  private fun perform(actions: List<Action>) {
    actions.forEach { action ->
      when (action) {
        is Action.Present -> present(action.sheetId, action.height, action.dismissible)
        is Action.Update -> sheets[action.sheetId]?.dialog?.update(action.height, action.dismissible)
        is Action.Dismiss -> sheets[action.sheetId]?.dialog?.dismissProgrammatically()
        is Action.SendSheetClosed -> callPage("sheetClosed", action.sheetId)
        is Action.SendSheetCloseRequested -> callPage("sheetCloseRequested", action.sheetId)
        is Action.Release -> release(action.sheetId)
      }
    }
  }

  private fun present(
    sheetId: String,
    height: Int,
    dismissible: Boolean,
  ) {
    val sheet = sheets[sheetId] ?: return
    val activity = reactContext.currentActivity
    // Without a screen to show it over, the sheet is gone, so Connect.js gets sheetClosed.
    if (activity == null || !isAttachedToWindow) {
      perform(lifecycle.sheetDismissed(sheetId))
      return
    }
    val dialog =
      sheet.dialog ?: ConnectInlineSheetDialog(
        activity = activity,
        webView = sheet.webView,
        backgroundColor = sheetBackgroundColor ?: Color.WHITE,
        onDismissed = { if (sheets[sheetId] === sheet) perform(lifecycle.sheetDismissed(sheetId)) },
        onCloseRequested = { if (sheets[sheetId] === sheet) perform(lifecycle.closeRequested(sheetId)) },
      ).also { sheet.dialog = it }
    sheet.webView.isStaged = false
    dialog.present(height, dismissible)
  }

  private fun release(sheetId: String) {
    val sheet = sheets.remove(sheetId) ?: return
    sheet.dialog?.dismissProgrammatically()
    (sheet.webView.parent as? ViewGroup)?.removeView(sheet.webView)
    sheet.webView.destroy()
  }

  private fun callPage(
    function: String,
    sheetId: String,
  ) {
    val payload = JSONObject().put("sheetId", sheetId)
    webView?.evaluateJavascript("window.$function && window.$function($payload); true;", null)
  }

  private fun dispatch(
    eventName: String,
    payload: WritableMap,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    UIManagerHelper
      .getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(HostEvent(surfaceId, id, eventName, payload))
  }

  private class HostEvent(
    surfaceId: Int,
    viewId: Int,
    private val name: String,
    private val payload: WritableMap,
  ) : Event<HostEvent>(surfaceId, viewId) {
    override fun getEventName() = name

    override fun getEventData(): WritableMap = payload
  }

  companion object {
    const val EVENT_ATTACH = "onAttach"
    const val EVENT_OPEN_URL = "onOpenUrl"
    private const val LIBRARY_CHROME_CLIENT_FIELD = "mWebChromeClient"
  }
}
