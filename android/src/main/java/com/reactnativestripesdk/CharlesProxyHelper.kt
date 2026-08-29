package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.util.Log
import com.stripe.android.core.networking.ConnectionFactory
import com.stripe.android.core.networking.StripeRequest
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URL
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Routes Stripe SDK traffic through Charles Proxy for debugging.
 * Set ENABLED = true and rebuild to use. Uses 10.0.2.2 (Android emulator host alias).
 */
internal object CharlesProxyHelper {
  private const val TAG = "CharlesProxy"

  // Flip to true and rebuild to route Stripe SDK traffic through Charles Proxy
  private const val ENABLED = false
  private const val PROXY_HOST = "10.0.2.2"
  private const val PROXY_PORT = 8888

  fun enableIfConfigured() {
    if (!ENABLED) return
    ConnectionFactory.Default.connectionOpener = ProxyConnectionOpener(PROXY_HOST, PROXY_PORT)
    Log.d(TAG, "Charles Proxy enabled at $PROXY_HOST:$PROXY_PORT")
  }
}

@Suppress("EmptyFunctionBlock", "MagicNumber")
private class ProxyConnectionOpener(
  private val host: String,
  private val port: Int,
) : ConnectionFactory.ConnectionOpener {
  override fun open(
    request: StripeRequest,
    callback: HttpURLConnection.(request: StripeRequest) -> Unit,
  ): HttpsURLConnection {
    val socketAddress = InetSocketAddress.createUnresolved(host, port)
    val proxy = Proxy(Proxy.Type.HTTP, socketAddress)

    return (URL(request.url).openConnection(proxy) as HttpsURLConnection).apply {
      sslSocketFactory = trustAllSocketFactory()
      callback(request)
    }
  }

  @SuppressLint("CustomX509TrustManager", "TrustAllX509TrustManager")
  private fun trustAllSocketFactory(): SSLSocketFactory {
    val trustAllCerts =
      arrayOf<TrustManager>(
        object : X509TrustManager {
          override fun checkClientTrusted(
            chain: Array<out X509Certificate>?,
            authType: String?,
          ) {
          }

          override fun checkServerTrusted(
            chain: Array<out X509Certificate>?,
            authType: String?,
          ) {
          }

          override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        },
      )

    val sslContext = SSLContext.getInstance("SSL")
    sslContext.init(null, trustAllCerts, SecureRandom())
    return sslContext.socketFactory
  }
}
