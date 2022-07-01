package com.reactnativestripesdk.utils

import android.text.InputFilter

class PostalCodeUtilities {

  companion object {

    fun createPostalCodeInputFilter(): InputFilter {
      return InputFilter { charSequence, start, end, _, _, _ ->
        for (i in start until end) {
          if (!isValidPostalCodeCharacter(charSequence[i])) {
            return@InputFilter ""
          }
        }
        return@InputFilter null
      }
    }

    private fun isValidPostalCodeCharacter(c: Char): Boolean {
      return Character.isLetterOrDigit(c)
        || c.isWhitespace()
        || c == '-'
    }
  }

}
