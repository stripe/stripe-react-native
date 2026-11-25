package com.reactnativestripesdk.connect

import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

/**
 * Takes over new windows for react-native-webview's [WebChromeClient], which never shows them, and forwards
 * everything else to it.
 *
 * WebView allows one pending window at a time, so [createWindow] returns the window's web view right away, before its
 * URL is known.
 */
@Suppress("TooManyFunctions")
internal class ConnectInlineChromeClient(
  val delegate: WebChromeClient,
  private val createWindow: (isUserGesture: Boolean) -> WebView?,
) : WebChromeClient() {
  override fun onCreateWindow(
    view: WebView,
    isDialog: Boolean,
    isUserGesture: Boolean,
    resultMsg: Message,
  ): Boolean {
    val window = createWindow(isUserGesture) ?: return false
    (resultMsg.obj as WebView.WebViewTransport).webView = window
    resultMsg.sendToTarget()
    return true
  }

  override fun onProgressChanged(
    view: WebView,
    newProgress: Int,
  ) = delegate.onProgressChanged(view, newProgress)

  override fun onReceivedTitle(
    view: WebView,
    title: String?,
  ) = delegate.onReceivedTitle(view, title)

  override fun onReceivedIcon(
    view: WebView,
    icon: Bitmap?,
  ) = delegate.onReceivedIcon(view, icon)

  override fun onReceivedTouchIconUrl(
    view: WebView,
    url: String?,
    precomposed: Boolean,
  ) = delegate.onReceivedTouchIconUrl(view, url, precomposed)

  override fun onShowCustomView(
    view: View,
    callback: CustomViewCallback,
  ) = delegate.onShowCustomView(view, callback)

  @Deprecated("Deprecated in Java")
  @Suppress("DEPRECATION")
  override fun onShowCustomView(
    view: View,
    requestedOrientation: Int,
    callback: CustomViewCallback,
  ) = delegate.onShowCustomView(view, requestedOrientation, callback)

  override fun onHideCustomView() = delegate.onHideCustomView()

  override fun onRequestFocus(view: WebView) = delegate.onRequestFocus(view)

  override fun onCloseWindow(window: WebView) = delegate.onCloseWindow(window)

  override fun onJsAlert(
    view: WebView,
    url: String?,
    message: String?,
    result: JsResult,
  ): Boolean = delegate.onJsAlert(view, url, message, result)

  override fun onJsConfirm(
    view: WebView,
    url: String?,
    message: String?,
    result: JsResult,
  ): Boolean = delegate.onJsConfirm(view, url, message, result)

  override fun onJsPrompt(
    view: WebView,
    url: String?,
    message: String?,
    defaultValue: String?,
    result: JsPromptResult,
  ): Boolean = delegate.onJsPrompt(view, url, message, defaultValue, result)

  override fun onJsBeforeUnload(
    view: WebView,
    url: String?,
    message: String?,
    result: JsResult,
  ): Boolean = delegate.onJsBeforeUnload(view, url, message, result)

  override fun onGeolocationPermissionsShowPrompt(
    origin: String?,
    callback: GeolocationPermissions.Callback?,
  ) = delegate.onGeolocationPermissionsShowPrompt(origin, callback)

  override fun onGeolocationPermissionsHidePrompt() = delegate.onGeolocationPermissionsHidePrompt()

  override fun onPermissionRequest(request: PermissionRequest) = delegate.onPermissionRequest(request)

  override fun onPermissionRequestCanceled(request: PermissionRequest) = delegate.onPermissionRequestCanceled(request)

  override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean = delegate.onConsoleMessage(consoleMessage)

  override fun getDefaultVideoPoster(): Bitmap? = delegate.defaultVideoPoster

  override fun getVideoLoadingProgressView(): View? = delegate.videoLoadingProgressView

  override fun getVisitedHistory(callback: ValueCallback<Array<String>>?) = delegate.getVisitedHistory(callback)

  override fun onShowFileChooser(
    webView: WebView,
    filePathCallback: ValueCallback<Array<Uri>>,
    fileChooserParams: FileChooserParams,
  ): Boolean = delegate.onShowFileChooser(webView, filePathCallback, fileChooserParams)
}
