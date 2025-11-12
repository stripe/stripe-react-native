package com.reactnativestripesdk

import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.stripe.android.paymentsheet.PaymentSheet
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class PaymentSheetAppearanceTest {
  private val context =
    BridgeReactContext(
      ApplicationProvider.getApplicationContext(),
    )

  @Before
  fun setup() {
    SoLoader.init(context, OpenSourceMergedSoMapping)
  }

  @Test
  fun testFullAppearanceConfiguration() {
    val json =
      """
      {
        "colors": {
          "primary": "#123456",
          "background": "#123456",
          "componentBackground": "#123456",
          "componentBorder": "#123456",
          "componentDivider": "#123456",
          "componentText": "#123456",
          "primaryText": "#123456",
          "secondaryText": "#123456",
          "placeholderText": "#123456",
          "icon": "#123456",
          "error": "#123456"
        },
        "shapes": {
          "borderRadius": 42.0,
          "borderWidth": 42.0
        },
        "font": {
          "scale": 42.0
        },
        "primaryButton": {
          "colors": {
            "background": "#123456",
            "text": "#123456",
            "border": "#123456",
            "successBackgroundColor": "#123456",
            "successTextColor": "#123456"
          },
          "shapes": {
            "borderRadius": 42.0,
            "borderWidth": 42.0,
            "height": 42.0
          }
        },
        "formInsetValues": {
          "left": 42.0,
          "top": 42.0,
          "right": 42.0,
          "bottom": 42.0
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    // Build expected appearance manually
    val testColor = Color.parseColor("#123456")

    val colorsBuilder = PaymentSheet.Colors.Builder()
    colorsBuilder.primary(testColor)
    colorsBuilder.surface(testColor)
    colorsBuilder.component(testColor)
    colorsBuilder.componentBorder(testColor)
    colorsBuilder.componentDivider(testColor)
    colorsBuilder.onComponent(testColor)
    colorsBuilder.onSurface(testColor)
    colorsBuilder.subtitle(testColor)
    colorsBuilder.placeholderText(testColor)
    colorsBuilder.appBarIcon(testColor)
    colorsBuilder.error(testColor)

    val shapesBuilder = PaymentSheet.Shapes.Builder()
    shapesBuilder.cornerRadiusDp(42.0f)
    shapesBuilder.borderStrokeWidthDp(42.0f)

    val typographyBuilder = PaymentSheet.Typography.Builder()
    typographyBuilder.sizeScaleFactor(42.0f)

    val primaryButtonColorsBuilder = PaymentSheet.PrimaryButtonColors.Builder()
    primaryButtonColorsBuilder.background(testColor)
    primaryButtonColorsBuilder.onBackground(testColor)
    primaryButtonColorsBuilder.border(testColor)
    primaryButtonColorsBuilder.successBackgroundColor(testColor)
    primaryButtonColorsBuilder.onSuccessBackgroundColor(testColor)

    val primaryButton =
      PaymentSheet.PrimaryButton(
        colorsLight = primaryButtonColorsBuilder.buildLight(),
        colorsDark = primaryButtonColorsBuilder.buildDark(),
        shape =
          PaymentSheet.PrimaryButtonShape(
            cornerRadiusDp = 42.0f,
            borderStrokeWidthDp = 42.0f,
            heightDp = 42.0f,
          ),
        typography = PaymentSheet.PrimaryButtonTypography(),
      )

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.typography(typographyBuilder.build())
    appearanceBuilder.colorsLight(colorsBuilder.buildLight())
    appearanceBuilder.colorsDark(colorsBuilder.buildDark())
    appearanceBuilder.shapes(shapesBuilder.build())
    appearanceBuilder.primaryButton(primaryButton)
    appearanceBuilder.formInsetValues(
      PaymentSheet.Insets(
        startDp = 42.0f,
        topDp = 42.0f,
        endDp = 42.0f,
        bottomDp = 42.0f,
      ),
    )

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testPartialAppearanceConfiguration() {
    val json =
      """
      {
        "colors": {
          "primary": "#123456",
          "componentBackground": "#123456",
          "componentDivider": "#123456",
          "primaryText": "#123456",
          "placeholderText": "#123456",
          "error": "#123456"
        },
        "shapes": {
          "borderRadius": 42.0
        },
        "primaryButton": {
          "colors": {
            "background": "#123456",
            "border": "#123456"
          },
          "shapes": {
            "borderRadius": 42.0,
            "height": 42.0
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    // Build expected appearance manually (only setting the properties that are in JSON)
    val testColor = Color.parseColor("#123456")

    val colorsBuilder = PaymentSheet.Colors.Builder()
    colorsBuilder.primary(testColor)
    colorsBuilder.component(testColor)
    colorsBuilder.componentDivider(testColor)
    colorsBuilder.onSurface(testColor)
    colorsBuilder.placeholderText(testColor)
    colorsBuilder.error(testColor)

    val shapesBuilder = PaymentSheet.Shapes.Builder()
    shapesBuilder.cornerRadiusDp(42.0f)

    val primaryButtonColorsBuilder = PaymentSheet.PrimaryButtonColors.Builder()
    primaryButtonColorsBuilder.background(testColor)
    primaryButtonColorsBuilder.border(testColor)

    val primaryButton =
      PaymentSheet.PrimaryButton(
        colorsLight = primaryButtonColorsBuilder.buildLight(),
        colorsDark = primaryButtonColorsBuilder.buildDark(),
        shape =
          PaymentSheet.PrimaryButtonShape(
            cornerRadiusDp = 42.0f,
            borderStrokeWidthDp = null,
            heightDp = 42.0f,
          ),
        typography = PaymentSheet.PrimaryButtonTypography(),
      )

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.typography(PaymentSheet.Typography.Builder().build())
    appearanceBuilder.colorsLight(colorsBuilder.buildLight())
    appearanceBuilder.colorsDark(colorsBuilder.buildDark())
    appearanceBuilder.shapes(shapesBuilder.build())
    appearanceBuilder.primaryButton(primaryButton)

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testFullEmbeddedAppearance_FlatWithRadio() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithRadio",
            "additionalInsets": 42.0,
            "flat": {
              "separatorThickness": 42.0,
              "topSeparatorEnabled": true,
              "bottomSeparatorEnabled": true,
              "separatorColor": "#123456",
              "separatorInsets": {
                "left": 42.0,
                "right": 42.0
              },
              "radio": {
                "selectedColor": "#123456",
                "unselectedColor": "#123456"
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatRadioColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors
        .Builder()
    flatRadioColorsBuilder.separatorColor(testColor)
    flatRadioColorsBuilder.selectedColor(testColor)
    flatRadioColorsBuilder.unselectedColor(testColor)

    val flatRadioBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio
        .Builder()
    flatRadioBuilder.separatorThicknessDp(42.0f)
    flatRadioBuilder.startSeparatorInsetDp(42.0f)
    flatRadioBuilder.endSeparatorInsetDp(42.0f)
    flatRadioBuilder.topSeparatorEnabled(true)
    flatRadioBuilder.bottomSeparatorEnabled(true)
    flatRadioBuilder.additionalVerticalInsetsDp(42.0f)
    flatRadioBuilder.colorsLight(flatRadioColorsBuilder.buildLight())
    flatRadioBuilder.colorsDark(flatRadioColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatRadioBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testPartialEmbeddedAppearance_FlatWithRadio() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithRadio",
            "flat": {
              "separatorThickness": 42.0,
              "topSeparatorEnabled": false,
              "separatorColor": "#123456",
              "radio": {
                "selectedColor": "#123456"
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatRadioColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors
        .Builder()
    flatRadioColorsBuilder.separatorColor(testColor)
    flatRadioColorsBuilder.selectedColor(testColor)

    val flatRadioBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio
        .Builder()
    flatRadioBuilder.separatorThicknessDp(42.0f)
    flatRadioBuilder.topSeparatorEnabled(false)
    flatRadioBuilder.colorsLight(flatRadioColorsBuilder.buildLight())
    flatRadioBuilder.colorsDark(flatRadioColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatRadioBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testFullEmbeddedAppearance_FlatWithCheckmark() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithCheckmark",
            "additionalInsets": 42.0,
            "flat": {
              "separatorThickness": 42.0,
              "topSeparatorEnabled": true,
              "bottomSeparatorEnabled": true,
              "separatorColor": "#123456",
              "separatorInsets": {
                "left": 42.0,
                "right": 42.0
              },
              "checkmark": {
                "color": "#123456",
                "inset": 42.0
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatCheckmarkColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors
        .Builder()
    flatCheckmarkColorsBuilder.separatorColor(testColor)
    flatCheckmarkColorsBuilder.checkmarkColor(testColor)

    val flatCheckmarkBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark
        .Builder()
    flatCheckmarkBuilder.separatorThicknessDp(42.0f)
    flatCheckmarkBuilder.startSeparatorInsetDp(42.0f)
    flatCheckmarkBuilder.endSeparatorInsetDp(42.0f)
    flatCheckmarkBuilder.topSeparatorEnabled(true)
    flatCheckmarkBuilder.bottomSeparatorEnabled(true)
    flatCheckmarkBuilder.checkmarkInsetDp(42.0f)
    flatCheckmarkBuilder.additionalVerticalInsetsDp(42.0f)
    flatCheckmarkBuilder.colorsLight(flatCheckmarkColorsBuilder.buildLight())
    flatCheckmarkBuilder.colorsDark(flatCheckmarkColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatCheckmarkBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testPartialEmbeddedAppearance_FlatWithCheckmark() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithCheckmark",
            "flat": {
              "separatorThickness": 42.0,
              "bottomSeparatorEnabled": false,
              "separatorColor": "#123456",
              "checkmark": {
                "color": "#123456"
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatCheckmarkColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors
        .Builder()
    flatCheckmarkColorsBuilder.separatorColor(testColor)
    flatCheckmarkColorsBuilder.checkmarkColor(testColor)

    val flatCheckmarkBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark
        .Builder()
    flatCheckmarkBuilder.separatorThicknessDp(42.0f)
    flatCheckmarkBuilder.bottomSeparatorEnabled(false)
    flatCheckmarkBuilder.colorsLight(flatCheckmarkColorsBuilder.buildLight())
    flatCheckmarkBuilder.colorsDark(flatCheckmarkColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatCheckmarkBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testFullEmbeddedAppearance_FlatWithDisclosure() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithDisclosure",
            "additionalInsets": 42.0,
            "flat": {
              "separatorThickness": 42.0,
              "topSeparatorEnabled": true,
              "bottomSeparatorEnabled": true,
              "separatorColor": "#123456",
              "separatorInsets": {
                "left": 42.0,
                "right": 42.0
              },
              "disclosure": {
                "color": "#123456"
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatDisclosureColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors
        .Builder()
    flatDisclosureColorsBuilder.separatorColor(testColor)
    flatDisclosureColorsBuilder.disclosureColor(testColor)

    val flatDisclosureBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
        .Builder()
    flatDisclosureBuilder.separatorThicknessDp(42.0f)
    flatDisclosureBuilder.startSeparatorInsetDp(42.0f)
    flatDisclosureBuilder.endSeparatorInsetDp(42.0f)
    flatDisclosureBuilder.topSeparatorEnabled(true)
    flatDisclosureBuilder.bottomSeparatorEnabled(true)
    flatDisclosureBuilder.additionalVerticalInsetsDp(42.0f)
    flatDisclosureBuilder.colorsLight(flatDisclosureColorsBuilder.buildLight())
    flatDisclosureBuilder.colorsDark(flatDisclosureColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatDisclosureBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testPartialEmbeddedAppearance_FlatWithDisclosure() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "flatWithDisclosure",
            "flat": {
              "separatorThickness": 42.0,
              "separatorColor": "#123456",
              "disclosure": {
                "color": "#123456"
              }
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val testColor = Color.parseColor("#123456")

    val flatDisclosureColorsBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors
        .Builder()
    flatDisclosureColorsBuilder.separatorColor(testColor)
    flatDisclosureColorsBuilder.disclosureColor(testColor)

    val flatDisclosureBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
        .Builder()
    flatDisclosureBuilder.separatorThicknessDp(42.0f)
    flatDisclosureBuilder.colorsLight(flatDisclosureColorsBuilder.buildLight())
    flatDisclosureBuilder.colorsDark(flatDisclosureColorsBuilder.buildDark())

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(flatDisclosureBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testFullEmbeddedAppearance_FloatingButton() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "floatingButton",
            "additionalInsets": 42.0,
            "floating": {
              "spacing": 42.0
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val floatingButtonBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FloatingButton
        .Builder()
    floatingButtonBuilder.additionalInsetsDp(42.0f)
    floatingButtonBuilder.spacingDp(42.0f)

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(floatingButtonBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  @Test
  fun testPartialEmbeddedAppearance_FloatingButton() {
    val json =
      """
      {
        "embeddedPaymentElement": {
          "row": {
            "style": "floatingButton",
            "floating": {
              "spacing": 42.0
            }
          }
        }
      }
      """.trimIndent()

    val map = jsonToMap(json)
    val appearanceFromJson = buildPaymentSheetAppearance(map, context)

    val floatingButtonBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FloatingButton
        .Builder()
    floatingButtonBuilder.spacingDp(42.0f)

    val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
    embeddedBuilder.rowStyle(floatingButtonBuilder.build())

    val appearanceBuilder = PaymentSheet.Appearance.Builder()
    appearanceBuilder.embeddedAppearance(embeddedBuilder.build())

    val expectedAppearance = appearanceBuilder.build()

    assertEquals(expectedAppearance, appearanceFromJson)
  }

  private fun jsonToMap(json: String): ReadableMap {
    val jsonObject = JSONObject(json)
    return jsonObjectToMap(jsonObject)
  }

  private fun jsonObjectToMap(jsonObject: JSONObject): ReadableMap {
    val map = JavaOnlyMap()
    val keys = jsonObject.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val value = jsonObject.get(key)
      when (value) {
        is JSONObject -> map.putMap(key, jsonObjectToMap(value))
        is String -> map.putString(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is Boolean -> map.putBoolean(key, value)
        is Long -> map.putDouble(key, value.toDouble())
        JSONObject.NULL -> {} // skip null values
      }
    }
    return map
  }
}
