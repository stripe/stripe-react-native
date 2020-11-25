package com.reactnativestripesdk

import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.ViewGroup
import android.widget.LinearLayout
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.EventDispatcher
import com.stripe.android.view.CardInputListener
import com.stripe.android.view.CardInputWidget


class StripeSdkViewManager : SimpleViewManager<CardInputWidget>() {
  override fun getName() = "CardField"

  private val cardDetails: MutableMap<String, Any> = mutableMapOf("cardNumber" to "", "cvc" to "")
  private lateinit var mEventDispatcher: EventDispatcher
  private lateinit var inputWidget: CardInputWidget

  fun onCardChanged() {
    Log.d("cardDetails", "onCardChanged: " + cardDetails.toString())
    mEventDispatcher.dispatchEvent(
      CardChangedEvent(inputWidget.id, cardDetails))
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocus"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }

  private fun setListeners() {
    inputWidget.setCardInputListener(object : CardInputListener {
      override fun onCardComplete() {}
      override fun onExpirationComplete() {}
      override fun onCvcComplete() {}
      override fun onFocusChange(focusField: CardInputListener.FocusField) {
        if (mEventDispatcher != null) {
          mEventDispatcher.dispatchEvent(
            CardFocusEvent(inputWidget.id, focusField.name))
        }
      }
    })

    inputWidget.setCardNumberTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["cardNumber"] = var1.toString()
        onCardChanged()
      }
    })

    inputWidget.setCvcNumberTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["cvc"] = var1.toString()
        onCardChanged()
      }
    })

    inputWidget.setExpiryDateTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        val splitted = var1.toString().split("/")
        cardDetails["expiryMonth"] = splitted[0]

        if (splitted.size == 2) {
          cardDetails["expiryYear"] = var1.toString().split("/")[1]
        }

        onCardChanged()
      }
    })
  }

  @ReactProp(name = "value")
  fun setValue(view: CardInputWidget, value: ReadableMap) {
    if (value == null) return
    view.setCardNumber(value.getString("cardNumber"))
    view.setCvcCode(value.getString("cvc"))
    val month = value.getInt("expiryMonth")
    val year = value.getInt("expiryYear")
    if(month != null && year != null) {
      view.setExpiryDate(month, year)
    }
  }

  override fun createViewInstance(reactContext: ThemedReactContext): CardInputWidget {
    inputWidget = CardInputWidget(reactContext)
    mEventDispatcher = reactContext.getNativeModule(UIManagerModule::class.java).eventDispatcher

    setListeners()

    return inputWidget
  }
}
