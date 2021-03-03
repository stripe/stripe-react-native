package com.reactnativestripesdk

import android.R
import android.content.res.ColorStateList
import android.graphics.Color
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.FrameLayout
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.EventDispatcher
import com.stripe.android.databinding.CardInputWidgetBinding
import com.stripe.android.view.CardInputListener
import com.stripe.android.view.CardInputWidget
import com.stripe.android.view.StripeEditText


class StripeSdkCardView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var mCardWidget: CardInputWidget
  private val cardDetails: MutableMap<String, Any> = mutableMapOf("number" to "", "cvc" to "", "expiryMonth" to "", "expiryYear" to "", "postalCode" to "")
  private var mEventDispatcher: EventDispatcher

  init {
    mCardWidget = CardInputWidget(context);
    mEventDispatcher = context.getNativeModule(UIManagerModule::class.java).eventDispatcher

    addView(mCardWidget)
    setListeners()

    viewTreeObserver.addOnGlobalLayoutListener { requestLayout() }
  }

  fun setValue(value: ReadableMap) {
    mCardWidget.setCardNumber(getValOr(value, "number", null))
    mCardWidget.setCvcCode(getValOr(value, "cvc", null))

    if (value.hasKey("expiryMonth") && value.hasKey("expiryYear")) {
      val month = value.getInt("expiryMonth")
      val year = value.getInt("expiryYear")
      mCardWidget.setExpiryDate(month, year)
    }
  }

  fun setCardStyle(value: ReadableMap) {
    val binding = CardInputWidgetBinding.bind(mCardWidget)

    getValOr(value, "backgroundColor", null)?.let {
      binding.container.setBackgroundColor(Color.parseColor("#b42222"))
    }
  }

  fun setPostalCodeEnabled(isEnabled: Boolean) {
    mCardWidget.postalCodeEnabled = isEnabled
    mCardWidget.usZipCodeRequired = isEnabled
  }

  fun getValue(): MutableMap<String, Any> {
    return cardDetails
  }

  fun onCardChanged() {
    val complete = mCardWidget.cardParams != null
    mEventDispatcher.dispatchEvent(
      CardChangedEvent(id, cardDetails, mCardWidget.postalCodeEnabled, complete))
  }

  private fun setListeners() {
    mCardWidget.setCardInputListener(object : CardInputListener {
      override fun onCardComplete() {}
      override fun onExpirationComplete() {}
      override fun onCvcComplete() {}
      override fun onFocusChange(focusField: CardInputListener.FocusField) {
        if (mEventDispatcher != null) {
          mEventDispatcher.dispatchEvent(
            CardFocusEvent(id, focusField.name))
        }
      }
    })

    mCardWidget.setCardNumberTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["number"] = var1.toString()
        onCardChanged()
      }
    })

    mCardWidget.setCvcNumberTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["cvc"] = var1.toString()
        onCardChanged()
      }
    })

    mCardWidget.setExpiryDateTextWatcher(object : TextWatcher {
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

    mCardWidget.setPostalCodeTextWatcher(object : TextWatcher {
      override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {}
      override fun afterTextChanged(p0: Editable?) {}
      override fun onTextChanged(var1: CharSequence?, var2: Int, var3: Int, var4: Int) {
        cardDetails["postalCode"] = var1.toString()
        onCardChanged()
      }
    })

  }

  override fun requestLayout() {
    super.requestLayout()
    post(mLayoutRunnable)
  }

  private val mLayoutRunnable = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    layout(left, top, right, bottom)
  }
}

fun <T : View> ViewGroup.getViewsByType(tClass: Class<T>): List<T> {
  return mutableListOf<T?>().apply {
    for (i in 0 until childCount) {
      val child = getChildAt(i)
      (child as? ViewGroup)?.let {
        addAll(child.getViewsByType(tClass))
      }
      if (tClass.isInstance(child))
        add(tClass.cast(child))
    }
  }.filterNotNull()
}
