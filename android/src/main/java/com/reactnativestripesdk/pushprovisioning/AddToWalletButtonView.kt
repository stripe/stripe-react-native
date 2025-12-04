package com.reactnativestripesdk.pushprovisioning

import android.annotation.SuppressLint
import android.content.res.ColorStateList
import android.graphics.drawable.Drawable
import android.graphics.drawable.RippleDrawable
import android.view.MotionEvent
import android.webkit.URLUtil
import androidx.appcompat.widget.AppCompatImageView
import androidx.core.graphics.drawable.toDrawable
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import com.facebook.common.executors.UiThreadImmediateExecutorService
import com.facebook.common.references.CloseableReference
import com.facebook.datasource.BaseDataSubscriber
import com.facebook.datasource.DataSource
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.image.CloseableBitmap
import com.facebook.imagepipeline.image.CloseableImage
import com.facebook.imagepipeline.request.ImageRequestBuilder
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.imagehelper.ResourceDrawableIdHelper
import com.reactnativestripesdk.utils.createError

@SuppressLint("ViewConstructor")
class AddToWalletButtonView(
  private val context: ThemedReactContext,
) : AppCompatImageView(context) {
  private var cardDetails: ReadableMap? = null
  private var ephemeralKey: String? = null
  private var sourceMap: ReadableMap? = null
  private var token: ReadableMap? = null

  private var loadedSource: String? = null
  private var currentDataSource: DataSource<CloseableReference<CloseableImage>>? = null

  init {
    scaleType = ScaleType.CENTER_CROP
    clipToOutline = true
  }

  override fun performClick(): Boolean {
    super.performClick()

    cardDetails?.getString("description")?.let { cardDescription ->
      ephemeralKey?.let { ephemeralKey ->
        PushProvisioningProxy.invoke(
          context.reactApplicationContext,
          this,
          cardDescription,
          ephemeralKey,
          token,
        )
      }
        ?: run {
          dispatchEvent(
            createError(
              "Failed",
              "Missing parameters. `ephemeralKey` must be supplied in the props to <AddToWalletButton />",
            ),
          )
        }
    }
      ?: run {
        dispatchEvent(
          createError(
            "Failed",
            "Missing parameters. `cardDetails.cardDescription` must be supplied in the props to <AddToWalletButton />",
          ),
        )
      }
    return true
  }

  init {
    this.setOnTouchListener { view, event ->
      if (event.action == MotionEvent.ACTION_DOWN) {
        view.performClick()
        return@setOnTouchListener true
      }
      return@setOnTouchListener false
    }
  }

  fun onAfterUpdateTransaction() {
    val uri = sourceMap?.getString("uri")
    if (uri == null) {
      cancelCurrentRequest()
      setImageDrawable(null)
      loadedSource = null
      return
    }

    if (uri != loadedSource) {
      loadedSource = uri
      if (URLUtil.isValidUrl(uri)) {
        // Debug mode: Image.resolveAssetSource resolves to local http:// URL
        loadImageFromUrl(uri)
      } else {
        // Release mode: Image.resolveAssetSource resolves to a drawable resource name
        loadImageFromDrawable(uri)
      }
    }
  }

  private fun loadImageFromUrl(url: String) {
    cancelCurrentRequest()

    val imageRequest =
      ImageRequestBuilder
        .newBuilderWithSource(url.toUri())
        .build()

    val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, context)
    currentDataSource = dataSource

    dataSource.subscribe(
      object : BaseDataSubscriber<CloseableReference<CloseableImage>>() {
        override fun onNewResultImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
          if (!dataSource.isFinished) return
          val imageRef = dataSource.result ?: return

          try {
            val image = imageRef.get()
            if (image is CloseableBitmap) {
              val drawable = image.underlyingBitmap.toDrawable(resources)
              setImageWithRipple(drawable)
            }
          } finally {
            CloseableReference.closeSafely(imageRef)
          }
        }

        override fun onFailureImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
          dispatchEvent(createError("Failed", "Failed to load the source from $url"))
        }
      },
      UiThreadImmediateExecutorService.getInstance(),
    )
  }

  private fun loadImageFromDrawable(resourceName: String) {
    // Instance is deprecated, but have to use until we drop support for RN 0.79
    @Suppress("DEPRECATION")
    val drawable = ResourceDrawableIdHelper.instance.getResourceDrawable(context, resourceName)
    if (drawable != null) {
      setImageWithRipple(drawable)
    } else {
      dispatchEvent(createError("Failed", "Failed to load drawable resource: $resourceName"))
    }
  }

  private fun setImageWithRipple(drawable: Drawable) {
    setImageDrawable(
      RippleDrawable(
        ColorStateList.valueOf("#e0e0e0".toColorInt()),
        drawable,
        null,
      ),
    )
  }

  private fun cancelCurrentRequest() {
    currentDataSource?.close()
    currentDataSource = null
  }

  fun onDropViewInstance() {
    cancelCurrentRequest()
  }

  fun setSourceMap(map: ReadableMap?) {
    sourceMap = map
  }

  fun setCardDetails(detailsMap: ReadableMap?) {
    cardDetails = detailsMap
  }

  fun setEphemeralKey(map: ReadableMap) {
    ephemeralKey = map.toHashMap().toString()
  }

  fun setToken(map: ReadableMap?) {
    token = map
  }

  fun dispatchEvent(error: WritableMap?) {
    UIManagerHelper
      .getEventDispatcherForReactTag(context, id)
      ?.dispatchEvent(AddToWalletCompleteEvent(context.surfaceId, id, error))
  }
}
