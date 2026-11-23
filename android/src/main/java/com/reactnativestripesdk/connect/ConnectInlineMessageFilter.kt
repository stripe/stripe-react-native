package com.reactnativestripesdk.connect

import android.net.Uri
import android.webkit.WebView
import java.lang.reflect.Proxy
import java.net.URI

/**
 * Replaces react-native-webview's `ReactNativeWebView` web message listener, which accepts every origin, with one
 * that only the Connect.js origin's main frame can reach.
 *
 * Uses reflection because this module doesn't compile against androidx.webkit or react-native-webview. The kept
 * names are in `proguard-rules.txt`.
 */
internal object ConnectInlineMessageFilter {
  private const val HANDLER_NAME = "ReactNativeWebView"

  /** Returns false if the listener can't be replaced, in which case the component mustn't load inline. */
  fun install(
    webView: WebView,
    connectJsOrigin: String,
  ): Boolean =
    runCatching {
      val origin = URI(connectJsOrigin)
      val featureClass = Class.forName("androidx.webkit.WebViewFeature")
      val isSupported =
        featureClass.getMethod("isFeatureSupported", String::class.java).invoke(null, "WEB_MESSAGE_LISTENER") as Boolean
      if (!isSupported) return false

      val compatClass = Class.forName("androidx.webkit.WebViewCompat")
      val listenerClass = Class.forName("androidx.webkit.WebViewCompat\$WebMessageListener")
      val getData = Class.forName("androidx.webkit.WebMessageCompat").getMethod("getData")
      val forwardMessage = webView.javaClass.getMethod("onMessage", String::class.java, String::class.java)

      val listener =
        Proxy.newProxyInstance(listenerClass.classLoader, arrayOf(listenerClass)) { proxy, method, args ->
          when (method.name) {
            "onPostMessage" -> {
              val (_, message, sourceOrigin, isMainFrame) = args
              val data = getData.invoke(message) as String?
              sourceOrigin as Uri
              val isFromConnectJs =
                ConnectInlineSheetRules.isSameOrigin(sourceOrigin.scheme, sourceOrigin.host, sourceOrigin.port, origin)
              if (isMainFrame == true && isFromConnectJs && data != null) {
                // The page URL, rather than the origin react-native-webview passes, lets JavaScript check the path too.
                forwardMessage.invoke(webView, data, webView.url)
              }
              null
            }
            "equals" -> proxy === args?.getOrNull(0)
            "hashCode" -> System.identityHashCode(proxy)
            "toString" -> "ConnectInlineMessageFilter"
            else -> null
          }
        }

      compatClass
        .getMethod("removeWebMessageListener", WebView::class.java, String::class.java)
        .invoke(null, webView, HANDLER_NAME)
      compatClass
        .getMethod("addWebMessageListener", WebView::class.java, String::class.java, Set::class.java, listenerClass)
        .invoke(null, webView, HANDLER_NAME, setOf(connectJsOrigin), listener)
      true
    }.getOrDefault(false)
}
