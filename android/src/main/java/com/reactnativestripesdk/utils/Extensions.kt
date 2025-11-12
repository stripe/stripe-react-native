package com.reactnativestripesdk.utils

import android.content.Context
import android.view.View
import android.view.inputmethod.InputMethodManager
import com.facebook.react.bridge.Dynamic
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

fun ReadableMap?.getBooleanOr(
  key: String,
  default: Boolean,
): Boolean = if (this?.hasKey(key) == true && this.getType(key) == ReadableType.Boolean) this.getBoolean(key) else default

fun ReadableMap?.getIntOrNull(key: String): Int? =
  if (this?.hasKey(key) == true && this.getType(key) == ReadableType.Number) this.getInt(key) else null

fun ReadableMap?.getIntOr(
  key: String,
  default: Int,
): Int = getIntOrNull(key) ?: default

fun ReadableMap?.getDoubleOrNull(key: String): Double? =
  if (this?.hasKey(key) == true && this.getType(key) == ReadableType.Number) this.getDouble(key) else null

fun ReadableMap?.getDoubleOr(
  key: String,
  default: Double,
): Double = getDoubleOrNull(key) ?: default

fun ReadableMap?.getFloatOrNull(key: String): Float? =
  if (this?.hasKey(key) == true && this.getType(key) == ReadableType.Number) this.getDouble(key).toFloat() else null

fun ReadableMap?.getBooleanOrNull(key: String): Boolean? =
  if (this?.hasKey(key) == true && this.getType(key) == ReadableType.Boolean) this.getBoolean(key) else null

fun ReadableMap?.getFloatOr(
  key: String,
  default: Float,
): Float = getFloatOrNull(key) ?: default

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
