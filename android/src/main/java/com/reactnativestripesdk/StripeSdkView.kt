package com.reactnativestripesdk

import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.EventDispatcher
import com.stripe.android.view.CardInputListener
import com.stripe.android.view.CardInputWidget


class StripeSdkView : SimpleViewManager<CardInputWidget>() {

  override fun getName() = "CardField"

  private var inputWidget: CardInputWidget? = null

  private lateinit var mEventDispatcher: EventDispatcher

  private val cardDetails: MutableMap<String, String> = mutableMapOf("cardNumber" to "", "cvc" to "", "expiryDate" to "")

  @ReactProp(name = "value")
  fun setValue(view: CardInputWidget, value: ReadableMap) {
    if (value == null) return
    view.setCardNumber(value.getString("cardNumber"))
    view.setCardNumber(value.getString("cvc"))
    view.setCardNumber(value.getString("expiryDate"))
  }

  fun onCardChanged() {
    Log.d("cardDetails", "onCardChanged: " + cardDetails.toString())
    if (mEventDispatcher != null) {
      mEventDispatcher.dispatchEvent(
        CardChangedEvent(inputWidget!!.id, cardDetails))
    }
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocus"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }


  private fun setListeners() {
    inputWidget?.setCardInputListener(object :CardInputListener{
      override fun onPostalCodeComplete() {}
      override fun onCardComplete() {}
      override fun onExpirationComplete() {}
      override fun onCvcComplete() {}
      override fun onFocusChange(focusField: String?) {
        if (mEventDispatcher != null) {
          mEventDispatcher.dispatchEvent(
            CardFocusEvent(inputWidget!!.id, focusField))
        }
      }
    })
    inputWidget?.setCardNumberTextWatcher(object :TextWatcher{
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) { }
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["cardNumber"] = var1.toString()
        onCardChanged()
      }
    })
    inputWidget?.setCvcNumberTextWatcher(object :TextWatcher{
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) { }
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["cvc"] = var1.toString()
        onCardChanged()
      }
    })
    inputWidget?.setExpiryDateTextWatcher(object :TextWatcher{
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) { }
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["expiryDate"] = var1.toString()
        onCardChanged()
      }
    })
  }

  override fun createViewInstance(reactContext: ThemedReactContext): CardInputWidget {
    mEventDispatcher = reactContext.getNativeModule(UIManagerModule::class.java).eventDispatcher

    inputWidget = CardInputWidget(reactContext)
    setListeners()

    return inputWidget as CardInputWidget
  }
}
