package com.reactnativestripesdk.utils

import android.content.Context
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

fun View.showSoftKeyboard() {
  post {
    if (this.requestFocus()) {
      val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager?
      imm?.showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)
    }
  }
}

fun View.hideSoftKeyboard() {
  if (this.requestFocus()) {
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager?
    imm?.hideSoftInputFromWindow(windowToken, 0)
  }
}

fun Fragment.removeFragment(context: ReactApplicationContext) {
  (context.currentActivity as? FragmentActivity)?.supportFragmentManager?.let {
    if (it.findFragmentByTag(this.tag) != null) {
      it.beginTransaction().remove(this).commitAllowingStateLoss()
    }
  }
}

fun ReadableMap.getBooleanOr(
  key: String,
  default: Boolean,
): Boolean = if (this.hasKey(key) && this.getType(key) == ReadableType.Boolean) this.getBoolean(key) else default

fun ReadableMap.getIntOrNull(key: String): Int? =
  if (this.hasKey(key) && this.getType(key) == ReadableType.Number) this.getInt(key) else null

fun ReadableMap.getIntOr(
  key: String,
  default: Int,
): Int = getIntOrNull(key) ?: default

fun ReadableMap.isEmpty() = !this.keySetIterator().hasNextKey()

fun ReadableMap.forEachKey(callback: (key: String) -> Unit) {
  val iterator = this.keySetIterator()
  while (iterator.hasNextKey()) {
    val key = iterator.nextKey()
    callback(key)
  }
}

fun ReadableArray.forEachMap(callback: (map: ReadableMap) -> Unit) {
  for (i in 0 until this.size()) {
    if (this.getType(i) == ReadableType.Map) {
      this.getMap(i)?.let(callback)
    }
  }
}

fun Dynamic.asMapOrNull(): ReadableMap? = if (this.type == ReadableType.Map) this.asMap() else null
