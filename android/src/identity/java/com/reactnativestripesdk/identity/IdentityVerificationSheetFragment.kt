package com.reactnativestripesdk.identity

import android.net.Uri
import android.os.Bundle
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import com.stripe.android.identity.IdentityVerificationSheet
import com.stripe.android.identity.IdentityVerificationSheet.VerificationFlowResult

/** Registers before STARTED, as required by Identity's public Activity Result API. */
internal class IdentityVerificationSheetFragment : Fragment() {
  internal var sheetFactory: (
    Fragment,
    IdentityVerificationSheet.Configuration,
    IdentityVerificationSheet.IdentityVerificationCallback,
  ) -> IdentityVerificationSheet =
    { fragment, configuration, callback -> IdentityVerificationSheet.create(fragment, configuration, callback) }

  private var sheet: IdentityVerificationSheet? = null
  private var launched = false
  private var disposed = false
  private var pendingResult: VerificationFlowResult? = null
  private var resultCallback: ((VerificationFlowResult) -> Unit)? = null

  @Suppress("TooGenericExceptionCaught")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (disposed) return
    launched = savedInstanceState?.getBoolean(LAUNCHED) ?: false
    try {
      sheet = sheetFactory(
        this,
        IdentityVerificationSheet.Configuration(brandLogo = Uri.parse(requireArguments().getString(BRAND_LOGO))),
        IdentityVerificationSheet.IdentityVerificationCallback(::onResult),
      )
    } catch (error: Exception) {
      onResult(VerificationFlowResult.Failed(error))
    }
  }

  @Suppress("TooGenericExceptionCaught")
  override fun onStart() {
    super.onStart()
    if (disposed || launched || pendingResult != null) return
    val currentSheet = sheet ?: return
    launched = true
    try {
      currentSheet.present(
        verificationSessionId = requireArguments().getString(SESSION_ID).orEmpty(),
        ephemeralKeySecret = requireArguments().getString(EPHEMERAL_KEY_SECRET).orEmpty(),
      )
    } catch (error: Exception) {
      onResult(VerificationFlowResult.Failed(error))
    }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putBoolean(LAUNCHED, launched)
  }

  internal fun setResultCallback(callback: ((VerificationFlowResult) -> Unit)?) {
    resultCallback = callback
    pendingResult?.let { callback?.invoke(it) }
  }

  internal fun dispose() {
    disposed = true
    resultCallback = null
    sheet = null
  }

  private fun onResult(result: VerificationFlowResult) {
    if (pendingResult != null) return
    pendingResult = result
    resultCallback?.invoke(result)
  }

  companion object {
    private const val SESSION_ID = "sessionId"
    private const val EPHEMERAL_KEY_SECRET = "ephemeralKeySecret"
    private const val BRAND_LOGO = "brandLogo"
    private const val LAUNCHED = "launched"

    internal fun arguments(sessionId: String, ephemeralKeySecret: String, brandLogo: Uri): Bundle =
      bundleOf(SESSION_ID to sessionId, EPHEMERAL_KEY_SECRET to ephemeralKeySecret, BRAND_LOGO to brandLogo.toString())
  }
}
