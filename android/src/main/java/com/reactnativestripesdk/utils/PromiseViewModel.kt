package com.reactnativestripesdk.utils

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.facebook.react.bridge.Promise

class PromiseViewModel : ViewModel() {
  private var promise: Promise? = null

  fun setPromise(promise: Promise?) {
    this.promise = promise
  }

  fun resolve(value: Any?) {
    promise?.resolve(value)
  }

  companion object {
    val Factory =
      viewModelFactory {
        initializer {
          PromiseViewModel()
        }
      }
  }
}
