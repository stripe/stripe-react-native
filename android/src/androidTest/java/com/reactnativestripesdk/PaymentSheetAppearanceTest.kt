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

    val colorsBuilderLight = paymentSheetColorsBuilderFull(PaymentSheet.Colors.Builder.light(), testColor)
    val colorsBuilderDark = paymentSheetColorsBuilderFull(PaymentSheet.Colors.Builder.dark(), testColor)

    val shapesBuilder = PaymentSheet.Shapes.Builder()
    shapesBuilder.cornerRadiusDp(42.0f)
    shapesBuilder.borderStrokeWidthDp(42.0f)

    val typographyBuilder = PaymentSheet.Typography.Builder()
    typographyBuilder.sizeScaleFactor(42.0f)

    val primaryButtonColorsBuilderLight = paymentSheetPrimaryButtonColorsBuilderFull(PaymentSheet.PrimaryButtonColors.Builder.light(), testColor)
    val primaryButtonColorsBuilderDark = paymentSheetPrimaryButtonColorsBuilderFull(PaymentSheet.PrimaryButtonColors.Builder.dark(), testColor)

    val primaryButton =
      PaymentSheet.PrimaryButton(
        colorsLight = primaryButtonColorsBuilderLight.build(),
        colorsDark = primaryButtonColorsBuilderDark.build(),
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
    appearanceBuilder.colorsLight(colorsBuilderLight.build())
    appearanceBuilder.colorsDark(colorsBuilderDark.build())
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

    val lightColorsBuilder = paymentSheetColorsBuilderPartial(PaymentSheet.Colors.Builder.light(), testColor)
    val darkColorsBuilder = paymentSheetColorsBuilderPartial(PaymentSheet.Colors.Builder.dark(), testColor)

    val shapesBuilder = PaymentSheet.Shapes.Builder()
    shapesBuilder.cornerRadiusDp(42.0f)

    val lightPrimaryButtonColorsBuilder = paymentSheetPrimaryButtonColorsBuilderPartial(PaymentSheet.PrimaryButtonColors.Builder.light(), testColor)
    val darkPrimaryButtonColorsBuilder = paymentSheetPrimaryButtonColorsBuilderPartial(PaymentSheet.PrimaryButtonColors.Builder.dark(), testColor)
    
    val primaryButton =
      PaymentSheet.PrimaryButton(
        colorsLight = lightPrimaryButtonColorsBuilder.build(),
        colorsDark = darkPrimaryButtonColorsBuilder.build(),
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
    appearanceBuilder.colorsLight(lightColorsBuilder.build())
    appearanceBuilder.colorsDark(darkColorsBuilder.build())
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

    val lightFlatRadioColorsBuilder = paymentSheetFlatRadioColorsBuilderFull(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder.light(), testColor)
    val darkFlatRadioColorsBuilder = paymentSheetFlatRadioColorsBuilderFull(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder.dark(), testColor)

    val flatRadioBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio
        .Builder()
    flatRadioBuilder.separatorThicknessDp(42.0f)
    flatRadioBuilder.startSeparatorInsetDp(42.0f)
    flatRadioBuilder.endSeparatorInsetDp(42.0f)
    flatRadioBuilder.topSeparatorEnabled(true)
    flatRadioBuilder.bottomSeparatorEnabled(true)
    flatRadioBuilder.additionalVerticalInsetsDp(42.0f)
    flatRadioBuilder.colorsLight(lightFlatRadioColorsBuilder.build())
    flatRadioBuilder.colorsDark(darkFlatRadioColorsBuilder.build())

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

    val lightFlatRadioColorsBuilder = paymentSheetFlatRadioColorsBuilderPartial(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder.light(), testColor)
    val darkFlatRadioColorsBuilder = paymentSheetFlatRadioColorsBuilderPartial(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder.dark(), testColor)

    val flatRadioBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio
        .Builder()
    flatRadioBuilder.separatorThicknessDp(42.0f)
    flatRadioBuilder.topSeparatorEnabled(false)
    flatRadioBuilder.colorsLight(lightFlatRadioColorsBuilder.build())
    flatRadioBuilder.colorsDark(darkFlatRadioColorsBuilder.build())

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

    val lightFlatCheckmarkColorsBuilder = paymentSheetFlatCheckmarkColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder.light(), testColor)
    val darkFlatCheckmarkColorsBuilder = paymentSheetFlatCheckmarkColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder.dark(), testColor)

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
    flatCheckmarkBuilder.colorsLight(lightFlatCheckmarkColorsBuilder.build())
    flatCheckmarkBuilder.colorsDark(darkFlatCheckmarkColorsBuilder.build())

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

    val lightFlatCheckmarkColorsBuilder = paymentSheetFlatCheckmarkColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder.light(), testColor)
    val darkFlatCheckmarkColorsBuilder = paymentSheetFlatCheckmarkColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder.dark(), testColor)

    val flatCheckmarkBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark
        .Builder()
    flatCheckmarkBuilder.separatorThicknessDp(42.0f)
    flatCheckmarkBuilder.bottomSeparatorEnabled(false)
    flatCheckmarkBuilder.colorsLight(lightFlatCheckmarkColorsBuilder.build())
    flatCheckmarkBuilder.colorsDark(darkFlatCheckmarkColorsBuilder.build())

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

    val lightFlatDisclosureColorsBuilder = paymentSheetFlatDisclosureColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder.light(), testColor)
    val darkFlatDisclosureColorsBuilder = paymentSheetFlatDisclosureColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder.dark(), testColor)

    val flatDisclosureBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
        .Builder()
    flatDisclosureBuilder.separatorThicknessDp(42.0f)
    flatDisclosureBuilder.startSeparatorInsetDp(42.0f)
    flatDisclosureBuilder.endSeparatorInsetDp(42.0f)
    flatDisclosureBuilder.topSeparatorEnabled(true)
    flatDisclosureBuilder.bottomSeparatorEnabled(true)
    flatDisclosureBuilder.additionalVerticalInsetsDp(42.0f)
    flatDisclosureBuilder.colorsLight(lightFlatDisclosureColorsBuilder.build())
    flatDisclosureBuilder.colorsDark(darkFlatDisclosureColorsBuilder.build())

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

    val lightFlatDisclosureColorsBuilder = paymentSheetFlatDisclosureColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder.light(), testColor)
    val darkFlatDisclosureColorsBuilder = paymentSheetFlatDisclosureColorsBuilder(PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder.dark(), testColor)
    val flatDisclosureBuilder =
      PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
        .Builder()
    flatDisclosureBuilder.separatorThicknessDp(42.0f)
    flatDisclosureBuilder.colorsLight(lightFlatDisclosureColorsBuilder.build())
    flatDisclosureBuilder.colorsDark(darkFlatDisclosureColorsBuilder.build())

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

  private fun paymentSheetColorsBuilderFull(builder: PaymentSheet.Colors.Builder, testColor: Int): PaymentSheet.Colors.Builder {
    builder.primary(testColor)
    builder.surface(testColor)
    builder.component(testColor)
    builder.componentBorder(testColor)
    builder.componentDivider(testColor)
    builder.onComponent(testColor)
    builder.onSurface(testColor)
    builder.subtitle(testColor)
    builder.placeholderText(testColor)
    builder.appBarIcon(testColor)
    builder.error(testColor)

    return builder
  }

  private fun paymentSheetColorsBuilderPartial(builder: PaymentSheet.Colors.Builder, testColor: Int): PaymentSheet.Colors.Builder {
    builder.primary(testColor)
    builder.component(testColor)
    builder.componentDivider(testColor)
    builder.onSurface(testColor)
    builder.placeholderText(testColor)
    builder.error(testColor)

    return builder
  }

  private fun paymentSheetPrimaryButtonColorsBuilderFull(builder: PaymentSheet.PrimaryButtonColors.Builder, testColor: Int): PaymentSheet.PrimaryButtonColors.Builder {
    builder.background(testColor)
    builder.onBackground(testColor)
    builder.border(testColor)
    builder.successBackgroundColor(testColor)
    builder.onSuccessBackgroundColor(testColor)

    return builder
  }

  private fun paymentSheetPrimaryButtonColorsBuilderPartial(builder: PaymentSheet.PrimaryButtonColors.Builder, testColor: Int): PaymentSheet.PrimaryButtonColors.Builder {
    builder.background(testColor)
    builder.border(testColor)

    return builder
  }

  private fun paymentSheetFlatRadioColorsBuilderFull(builder: PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder, testColor: Int): PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder {
    builder.separatorColor(testColor)
    builder.selectedColor(testColor)
    builder.unselectedColor(testColor)

    return builder
  }

  private fun paymentSheetFlatRadioColorsBuilderPartial(builder: PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder, testColor: Int): PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors.Builder {
    builder.separatorColor(testColor)
    builder.selectedColor(testColor)

    return builder
  }

  private fun paymentSheetFlatCheckmarkColorsBuilder(builder: PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder, testColor: Int): PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors.Builder {
    builder.separatorColor(testColor)
    builder.checkmarkColor(testColor)

    return builder
  }

  private fun paymentSheetFlatDisclosureColorsBuilder(builder: PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder, testColor: Int): PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors.Builder {
    builder.separatorColor(testColor)
    builder.disclosureColor(testColor)

    return builder
  }

}
