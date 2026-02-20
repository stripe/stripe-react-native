package com.reactnativestripesdk.addresssheet

import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AddressSheetViewTest {
  private val testCity = "testCity"
  private val testCountry = "testCountry"
  private val testLine1 = "testLine1"
  private val testLine2 = "testLine2"
  private val testPostalCode = "testPostalCode"
  private val testState = "testState"
  private val testName = "testName"
  private val testPhone = "testPhone"

  @Test
  fun buildAddressDetails_Default() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(),
      )
    assertNull(addressDetails.address)
    assertNull(addressDetails.name)
    assertFalse(addressDetails.isCheckboxSelected ?: false)
    assertNull(addressDetails.phoneNumber)
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
    assertEquals(testCity, addressDetails.address?.city)
    assertEquals(testLine1, addressDetails.address?.line1)
    assertEquals(testName, addressDetails.name)
    assertTrue(addressDetails.isCheckboxSelected ?: false)
    assertEquals(testPhone, addressDetails.phoneNumber)
  }

  @Test
  fun buildAddressDetails_OnlyName() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "name" to testName,
        ),
      )
    assertEquals(testName, addressDetails.name)
    assertNull(addressDetails.phoneNumber)
    assertNull(addressDetails.address)
    assertFalse(addressDetails.isCheckboxSelected ?: false)
  }

  @Test
  fun buildAddressDetails_OnlyPhone() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "phone" to testPhone,
        ),
      )
    assertNull(addressDetails.name)
    assertEquals(testPhone, addressDetails.phoneNumber)
    assertNull(addressDetails.address)
    assertFalse(addressDetails.isCheckboxSelected ?: false)
  }

  @Test
  fun buildAddressDetails_OnlyCheckboxSelected() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "isCheckboxSelected" to true,
        ),
      )
    assertNull(addressDetails.name)
    assertNull(addressDetails.phoneNumber)
    assertNull(addressDetails.address)
    assertTrue(addressDetails.isCheckboxSelected ?: false)
  }

  @Test
  fun buildAddressDetails_CheckboxSelectedFalse() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "name" to testName,
          "isCheckboxSelected" to false,
        ),
      )
    assertEquals(testName, addressDetails.name)
    assertFalse(addressDetails.isCheckboxSelected ?: false)
  }

  @Test
  fun buildAddressDetails_PartialAddress() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "name" to testName,
          "address" to
            readableMapOf(
              "country" to testCountry,
              "postalCode" to testPostalCode,
            ),
        ),
      )
    assertEquals(testName, addressDetails.name)
    assertNotNull(addressDetails.address)
    assertEquals(testCountry, addressDetails.address?.country)
    assertEquals(testPostalCode, addressDetails.address?.postalCode)
    assertNull(addressDetails.address?.city)
    assertNull(addressDetails.address?.line1)
    assertNull(addressDetails.address?.line2)
    assertNull(addressDetails.address?.state)
  }

  @Test
  fun buildAddressDetails_FullAddress() {
    val addressDetails =
      AddressSheetView.buildAddressDetails(
        readableMapOf(
          "address" to
            readableMapOf(
              "city" to testCity,
              "country" to testCountry,
              "line1" to testLine1,
              "line2" to testLine2,
              "postalCode" to testPostalCode,
              "state" to testState,
            ),
        ),
      )
    assertNotNull(addressDetails.address)
    assertEquals(testCity, addressDetails.address?.city)
    assertEquals(testCountry, addressDetails.address?.country)
    assertEquals(testLine1, addressDetails.address?.line1)
    assertEquals(testLine2, addressDetails.address?.line2)
    assertEquals(testPostalCode, addressDetails.address?.postalCode)
    assertEquals(testState, addressDetails.address?.state)
  }

  @Test
  fun buildAddress_NullMap_ReturnsNull() {
    val address = AddressSheetView.buildAddress(null)
    assertNull(address)
  }

  @Test
  fun buildAddress_EmptyMap_ReturnsAddressWithNulls() {
    val address =
      AddressSheetView.buildAddress(
        readableMapOf(),
      )
    assertNotNull(address)
    assertNull(address?.city)
    assertNull(address?.country)
    assertNull(address?.state)
    assertNull(address?.postalCode)
    assertNull(address?.line1)
    assertNull(address?.line2)
  }

  @Test
  fun buildAddress_FullAddress_ReturnsComplete() {
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
    assertEquals(testCity, address?.city)
    assertEquals(testLine1, address?.line1)
    assertEquals(testLine2, address?.line2)
    assertEquals(testState, address?.state)
    assertEquals(testCountry, address?.country)
    assertEquals(testPostalCode, address?.postalCode)
  }

  @Test
  fun buildAddress_PartialFields_ReturnsPartial() {
    val address =
      AddressSheetView.buildAddress(
        readableMapOf(
          "city" to testCity,
          "postalCode" to testPostalCode,
        ),
      )
    assertNotNull(address)
    assertEquals(testCity, address?.city)
    assertEquals(testPostalCode, address?.postalCode)
    assertNull(address?.country)
    assertNull(address?.line1)
    assertNull(address?.line2)
    assertNull(address?.state)
  }

  @Test
  fun buildAddress_OnlyRequiredFields_ReturnsPartial() {
    val address =
      AddressSheetView.buildAddress(
        readableMapOf(
          "country" to testCountry,
          "line1" to testLine1,
        ),
      )
    assertNotNull(address)
    assertEquals(testCountry, address?.country)
    assertEquals(testLine1, address?.line1)
    assertNull(address?.city)
    assertNull(address?.line2)
    assertNull(address?.postalCode)
    assertNull(address?.state)
  }

  @Test
  fun getFieldConfiguration_Hidden() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
      AddressSheetView.getFieldConfiguration("hidden"),
    )
  }

  @Test
  fun getFieldConfiguration_Required() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.REQUIRED,
      AddressSheetView.getFieldConfiguration("required"),
    )
  }

  @Test
  fun getFieldConfiguration_Optional() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.OPTIONAL,
      AddressSheetView.getFieldConfiguration("optional"),
    )
  }

  @Test
  fun getFieldConfiguration_Invalid_DefaultsToHidden() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
      AddressSheetView.getFieldConfiguration("invalid"),
    )
  }

  @Test
  fun getFieldConfiguration_Null_DefaultsToHidden() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
      AddressSheetView.getFieldConfiguration(null),
    )
  }

  @Test
  fun getFieldConfiguration_EmptyString_DefaultsToHidden() {
    assertEquals(
      AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN,
      AddressSheetView.getFieldConfiguration(""),
    )
  }

  @Test
  fun buildAdditionalFieldsConfiguration_EmptyMap_ReturnsDefaults() {
    val result = AddressSheetView.buildAdditionalFieldsConfiguration(readableMapOf())
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_PhoneRequired() {
    val params = readableMapOf("phoneNumber" to "required")

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_PhoneOptional() {
    val params = readableMapOf("phoneNumber" to "optional")

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_PhoneHidden() {
    val params = readableMapOf("phoneNumber" to "hidden")

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_WithCheckboxLabel() {
    val label = "custom label"
    val params = readableMapOf("checkboxLabel" to label)

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_FullConfig() {
    val label = "Accept terms and conditions"
    val params = readableMapOf("phoneNumber" to "required", "checkboxLabel" to label)

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildAdditionalFieldsConfiguration_InvalidPhoneValue_DefaultsToHidden() {
    val params = readableMapOf("phoneNumber" to "invalid")

    val result = AddressSheetView.buildAdditionalFieldsConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildResult_FullDetails_ReturnsCompleteMap() {
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

    assertEquals(expected, received)
  }

  @Test
  fun buildResult_NullAddress_ReturnsMapWithAddressContainingNulls() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address = null,
          phoneNumber = testPhone,
          isCheckboxSelected = true,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    assertEquals(testName, result?.getString("name"))
    assertEquals(testPhone, result?.getString("phone"))
    assertTrue(result?.getBoolean("isCheckboxSelected") ?: false)
    // Address map is created but all fields are null
    val address = result?.getMap("address")
    assertNotNull(address)
    assertNull(address?.getString("city"))
    assertNull(address?.getString("country"))
    assertNull(address?.getString("line1"))
    assertNull(address?.getString("line2"))
    assertNull(address?.getString("postalCode"))
    assertNull(address?.getString("state"))
  }

  @Test
  fun buildResult_NullName_ReturnsMapWithNullName() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = null,
          address =
            PaymentSheet.Address(
              city = testCity,
              country = testCountry,
            ),
          phoneNumber = testPhone,
          isCheckboxSelected = false,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    assertNull(result?.getString("name"))
    assertEquals(testPhone, result?.getString("phone"))
    assertFalse(result?.getBoolean("isCheckboxSelected") ?: true)
  }

  @Test
  fun buildResult_NullPhoneNumber_ReturnsMapWithNullPhone() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address =
            PaymentSheet.Address(
              city = testCity,
              country = testCountry,
            ),
          phoneNumber = null,
          isCheckboxSelected = true,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    assertEquals(testName, result?.getString("name"))
    assertNull(result?.getString("phone"))
  }

  @Test
  fun buildResult_CheckboxSelectedFalse_ReturnsFalse() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address = null,
          phoneNumber = null,
          isCheckboxSelected = false,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    assertFalse(result?.getBoolean("isCheckboxSelected") ?: true)
  }

  @Test
  fun buildResult_CheckboxSelectedNull_ReturnsFalse() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address = null,
          phoneNumber = null,
          isCheckboxSelected = null,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    // Null checkbox is coerced to false
    assertFalse(result?.getBoolean("isCheckboxSelected") ?: true)
  }

  @Test
  fun buildResult_PartialAddress_ReturnsPartialAddressMap() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = testName,
          address =
            PaymentSheet.Address(
              country = testCountry,
              postalCode = testPostalCode,
            ),
          phoneNumber = testPhone,
          isCheckboxSelected = true,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    val address = result?.getMap("address")
    assertNotNull(address)
    assertNull(address?.getString("city"))
    assertEquals(testCountry, address?.getString("country"))
    assertNull(address?.getString("line1"))
    assertNull(address?.getString("line2"))
    assertEquals(testPostalCode, address?.getString("postalCode"))
    assertNull(address?.getString("state"))
  }

  @Test
  fun buildResult_MinimalData_ReturnsValidMap() {
    val received =
      AddressSheetView.buildResult(
        AddressDetails(
          name = null,
          address = null,
          phoneNumber = null,
          isCheckboxSelected = null,
        ),
      )

    val result = received.getMap("result")
    assertNotNull(result)
    assertNull(result?.getString("name"))
    assertNull(result?.getString("phone"))
    // Address map is created but all fields are null
    val address = result?.getMap("address")
    assertNotNull(address)
    assertNull(address?.getString("city"))
    assertNull(address?.getString("country"))
    assertNull(address?.getString("line1"))
    assertNull(address?.getString("line2"))
    assertNull(address?.getString("postalCode"))
    assertNull(address?.getString("state"))
    assertFalse(result?.getBoolean("isCheckboxSelected") ?: true)
  }
}
