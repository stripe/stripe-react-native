package com.reactnativestripesdk.connect

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.view.MotionEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Holds a window that an inline Connect component opened with `window.open()`.
 *
 * It has no bridge of its own: Connect.js in the component's web view reports on it. It stays on the page it was
 * opened with, and its links open outside the app.
 */
@SuppressLint("ViewConstructor", "SetJavaScriptEnabled")
internal class ConnectInlineSheetWebView(
  context: Context,
  userAgent: String?,
  val isUserGesture: Boolean,
  private val listener: Listener,
) : WebView(context) {
  interface Listener {
    /** The window's first page. Returns true to keep it as a sheet. */
    fun onWindowOpened(
      window: ConnectInlineSheetWebView,
      url: String,
    ): Boolean

    fun onOpenUrl(url: String)

    /** The page called `window.close()`, or the window left its page. */
    fun onWindowClosed(window: ConnectInlineSheetWebView)
  }

  var sheetId: String? = null

  /** While staged, the window is laid out behind the app's content so it can render before the sheet appears. */
  var isStaged = false
    set(value) {
      field = value
      importantForAccessibility =
        if (value) View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS else View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
    }

  private var windowUrl: String? = null
  private var didClose = false

  init {
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.mediaPlaybackRequiresUserGesture = false
    // Links that target a new window load here instead, where they're blocked and opened outside the app.
    settings.setSupportMultipleWindows(false)
    settings.javaScriptCanOpenWindowsAutomatically = false
    userAgent?.let { settings.userAgentString = it }
    webViewClient = SheetWebViewClient()
    webChromeClient =
      object : WebChromeClient() {
        override fun onCloseWindow(window: WebView) {
          close()
        }
      }
  }

  @SuppressLint("ClickableViewAccessibility")
  override fun dispatchTouchEvent(event: MotionEvent): Boolean = !isStaged && super.dispatchTouchEvent(event)

  private fun close() {
    if (didClose) return
    didClose = true
    listener.onWindowClosed(this)
  }

  /** Returns true to block the navigation. */
  private fun shouldBlock(
    url: String,
    hasGesture: Boolean,
  ): Boolean {
    val firstUrl = windowUrl
    if (firstUrl == null) {
      windowUrl = url
      return !listener.onWindowOpened(this, url)
    }
    return when (ConnectInlineSheetRules.decideLaterSheetNavigation(url, firstUrl, hasGesture)) {
      ConnectInlineSheetRules.NavigationDecision.ALLOW -> false
      ConnectInlineSheetRules.NavigationDecision.BLOCK -> true
      ConnectInlineSheetRules.NavigationDecision.BLOCK_AND_OPEN_OUTSIDE -> {
        listener.onOpenUrl(url)
        true
      }
    }
  }

  private inner class SheetWebViewClient : WebViewClient() {
    override fun shouldOverrideUrlLoading(
      view: WebView,
      request: WebResourceRequest,
    ): Boolean {
      if (!request.isForMainFrame) return false
      return shouldBlock(request.url.toString(), request.hasGesture())
    }

    override fun onPageStarted(
      view: WebView,
      url: String,
      favicon: Bitmap?,
    ) {
      // Some loads, like the window's first page, don't go through shouldOverrideUrlLoading.
      if (url == ABOUT_BLANK) return
      val firstUrl = windowUrl
      if (firstUrl == null) {
        if (shouldBlock(url, hasGesture = false)) view.stopLoading()
      } else if (ConnectInlineSheetRules.decideLaterSheetNavigation(url, firstUrl, hasGesture = false) !=
        ConnectInlineSheetRules.NavigationDecision.ALLOW
      ) {
        // A load that got past shouldOverrideUrlLoading leaves the page, so the sheet closes instead.
        view.stopLoading()
        close()
      }
    }
  }

  private companion object {
    const val ABOUT_BLANK = "about:blank"
  }
}
