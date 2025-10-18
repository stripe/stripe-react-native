package com.reactnativestripesdk.addresssheet

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import org.junit.Assert
import org.junit.Before
import org.junit.Test

class AddressSheetViewTest {
  private val testCity = "testCity"
  private val testCountry = "testCountry"
  private val testLine1 = "testLine1"
  private val testLine2 = "testLine2"
  private val testPostalCode = "testPostalCode"
  private val testState = "testState"
  private val testName = "testName"
  private val testPhone = "testPhone"

  @Before
  fun setup() {
    SoLoader.init(ApplicationProvider.getApplicationContext(), OpenSourceMergedSoMapping)
  }

  @Test
  fun buildAddressDetails_Default() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(),
      )
    Assert.assertNull(addressDetails.address)
    Assert.assertNull(addressDetails.name)
    Assert.assertFalse(addressDetails.isCheckboxSelected ?: false)
    Assert.assertNull(addressDetails.phoneNumber)
  }

  @Test
  fun buildAddressDetails_Custom() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "name" to testName,
          "phone" to testPhone,
          "isCheckboxSelected" to true,
          "address" to
            readableMapOf(
              "city" to testCity,
              "line1" to testLine1,
            ),
        ),
      )
    Assert.assertEquals(addressDetails.address?.city, testCity)
    Assert.assertEquals(addressDetails.address?.line1, testLine1)
    Assert.assertEquals(addressDetails.name, testName)
    Assert.assertEquals(addressDetails.isCheckboxSelected, true)
    Assert.assertEquals(addressDetails.phoneNumber, testPhone)
  }

  @Test
  fun buildAddress_Default() {
    val address =
      AddressSheetView.buildAddress(
        readableMapOf(),
      )
    Assert.assertNull(address?.city)
    Assert.assertNull(address?.country)
    Assert.assertNull(address?.state)
    Assert.assertNull(address?.postalCode)
    Assert.assertNull(address?.line1)
    Assert.assertNull(address?.line2)
  }

  @Test
  fun buildAddress_Custom() {
    val address =
      AddressSheetView.buildAddress(
        readableMapOf(
          "city" to testCity,
          "line1" to testLine1,
          "country" to testCountry,
          "postalCode" to testPostalCode,
          "line2" to testLine2,
          "state" to testState,
        ),
      )
    Assert.assertEquals(address?.city, testCity)
    Assert.assertEquals(address?.line1, testLine1)
    Assert.assertEquals(address?.line2, testLine2)
    Assert.assertEquals(address?.state, testState)
    Assert.assertEquals(address?.country, testCountry)
    Assert.assertEquals(address?.postalCode, testPostalCode)
  }

  @Test
  fun getFieldConfiguration() {
    Assert.assertEquals(
      AddressSheetView.getFieldConfiguration("hidden"),
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
    )

    Assert.assertEquals(
      AddressSheetView.getFieldConfiguration("required"),
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.REQUIRED,
    )

    Assert.assertEquals(
      AddressSheetView.getFieldConfiguration("optional"),
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.OPTIONAL,
    )

    Assert.assertEquals(
      AddressSheetView.getFieldConfiguration("anything"),
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
    )
  }

  @Test
  fun buildAdditionalFieldsConfiguration_Default() {
    val result = AddressSheetView.buildAdditionalFieldsConfiguration(WritableNativeMap())

    Assert.assertEquals(
      result.phone,
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
    )

    Assert.assertNull(result.checkboxLabel)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_Custom() {
    val label = "custom label"
    val params =
      WritableNativeMap().also {
        it.putString("phoneNumber", "required")
        it.putString("checkboxLabel", label)
      }

    val received = AddressSheetView.buildAdditionalFieldsConfiguration(params)

    Assert.assertEquals(
      received.phone,
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.REQUIRED,
    )

    Assert.assertEquals(
      received.checkboxLabel,
      label,
    )
  }

  @Test
  fun buildResult() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address =
            PaymentSheet.Address(
              city = testCity,
              state = testState,
              country = testCountry,
              line2 = testLine2,
              line1 = testLine1,
              postalCode = testPostalCode,
            ),
          phoneNumber = testPhone,
          isCheckboxSelected = true,
        ),
      )

    val expected =
      readableMapOf(
        "result" to
          readableMapOf(
            "name" to testName,
            "address" to
              readableMapOf(
                "city" to testCity,
                "country" to testCountry,
                "state" to testState,
                "line1" to testLine1,
                "line2" to testLine2,
                "postalCode" to testPostalCode,
              ),
            "phone" to testPhone,
            "isCheckboxSelected" to true,
          ),
      )

    Assert.assertEquals(expected, received)
  }
}
