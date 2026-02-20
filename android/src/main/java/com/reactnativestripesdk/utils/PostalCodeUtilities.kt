package com.reactnativestripesdk.utils

class PostalCodeUtilities {
  companion object {
    internal fun isValidGlobalPostalCodeCharacter(c: Char): Boolean = Character.isLetterOrDigit(c) || c.isWhitespace() || c == '-'

    internal fun isValidUsPostalCodeCharacter(c: Char): Boolean = Character.isDigit(c) || c.isWhitespace() || c == '-'
  }
}
