package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.createCanAddCardResult
import com.reactnativestripesdk.utils.mapToAddress
import com.reactnativestripesdk.utils.mapToBillingDetails
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.parseCustomPaymentMethods
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.model.CardBrand
import org.junit.Assert
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class MappersTest {
  @Test
  fun createCanAddCardResult_NoStatus() {
    val result =
      createCanAddCardResult(
        true,
        null,
        null,
      )
    Assert.assertNotNull(result.getMap("details"))
    Assert.assertNull(result.getMap("details")?.getString("status"))
    Assert.assertNull(result.getMap("details")?.getMap("token"))
    Assert.assertTrue(result.getBoolean("canAddCard"))
  }

  @Test
  fun createCanAddCardResult_WithToken() {
    val tokenMap = readableMapOf("key" to "value") as WritableMap
    val result =
      createCanAddCardResult(
        true,
        "CARD_ALREADY_EXISTS",
        tokenMap,
      )
    Assert.assertTrue(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "CARD_ALREADY_EXISTS")
    Assert.assertEquals(details?.getMap("token")?.getString("key"), "value")
  }

  @Test
  fun createCanAddCardResult_UnsupportedDevice() {
    val result =
      createCanAddCardResult(
        false,
        "UNSUPPORTED_DEVICE",
        null,
      )
    Assert.assertFalse(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "UNSUPPORTED_DEVICE")
    Assert.assertNull(details?.getMap("token"))
  }

  @Test
  fun createCanAddCardResult_MissingConfiguration() {
    val result =
      createCanAddCardResult(
        false,
        "MISSING_CONFIGURATION",
        null,
      )
    Assert.assertFalse(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "MISSING_CONFIGURATION")
    Assert.assertNull(details?.getMap("token"))
  }

  // ============================================
  // mapToPreferredNetworks Tests
  // ============================================

  @Test
  fun mapToPreferredNetworks_NullInput_ReturnsEmptyList() {
    val result = mapToPreferredNetworks(null)
    assertTrue(result.isEmpty())
  }

  @Test
  fun mapToPreferredNetworks_EmptyList_ReturnsEmptyList() {
    val result = mapToPreferredNetworks(emptyList())
    assertTrue(result.isEmpty())
  }

  @Test
  fun mapToPreferredNetworks_AllValidValues_ReturnsMappedList() {
    val input = listOf(0, 1, 2, 3, 4, 5, 6, 7, 8)
    val result = mapToPreferredNetworks(input)

    assertEquals(9, result.size)
    assertEquals(CardBrand.JCB, result[0])
    assertEquals(CardBrand.AmericanExpress, result[1])
    assertEquals(CardBrand.CartesBancaires, result[2])
    assertEquals(CardBrand.DinersClub, result[3])
    assertEquals(CardBrand.Discover, result[4])
    assertEquals(CardBrand.MasterCard, result[5])
    assertEquals(CardBrand.UnionPay, result[6])
    assertEquals(CardBrand.Visa, result[7])
    assertEquals(CardBrand.Unknown, result[8])
  }

  @Test
  fun mapToPreferredNetworks_InvalidIndices_FiltersOutInvalid() {
    val input = listOf(7, 99, 5, -1, 4)
    val result = mapToPreferredNetworks(input)

    // Only valid indices (7, 5, 4) should be mapped
    assertEquals(3, result.size)
    assertEquals(CardBrand.Visa, result[0])
    assertEquals(CardBrand.MasterCard, result[1])
    assertEquals(CardBrand.Discover, result[2])
  }

  @Test
  fun mapToPreferredNetworks_OnlyInvalidIndices_ReturnsEmptyList() {
    val result = mapToPreferredNetworks(listOf(99, -1, 100))
    assertTrue(result.isEmpty())
  }

  // ============================================
  // parseCustomPaymentMethods Tests
  // ============================================

  @Test
  fun parseCustomPaymentMethods_NullConfig_ReturnsEmptyList() {
    val result = parseCustomPaymentMethods(null)
    assertTrue(result.isEmpty())
  }

  @Test
  fun parseCustomPaymentMethods_EmptyMap_ReturnsEmptyList() {
    val params = readableMapOf()
    val result = parseCustomPaymentMethods(params)
    assertTrue(result.isEmpty())
  }

  @Test
  fun parseCustomPaymentMethods_NoCustomPaymentMethodsKey_ReturnsEmptyList() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = parseCustomPaymentMethods(params)
    assertTrue(result.isEmpty())
  }

  @Test
  fun parseCustomPaymentMethods_EmptyArray_ReturnsEmptyList() {
    val params =
      readableMapOf(
        "customPaymentMethods" to readableArrayOf(),
      )
    val result = parseCustomPaymentMethods(params)
    assertTrue(result.isEmpty())
  }

  @Test
  fun parseCustomPaymentMethods_SingleValidMethod_ReturnsSingleItem() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_test123",
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(1, result.size)
    assertEquals("cpmt_test123", result[0].id)
  }

  @Test
  fun parseCustomPaymentMethods_WithSubtitle_ReturnsWithSubtitle() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_test123",
              "subtitle" to "Pay later with installments",
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(1, result.size)
    assertEquals("cpmt_test123", result[0].id)
    // subtitle and disableBillingDetailCollection are internal properties
    // we verify the function doesn't crash and returns the correct object
  }

  @Test
  fun parseCustomPaymentMethods_WithDisableBillingDetailCollectionTrue_ReturnsValidObject() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_test123",
              "disableBillingDetailCollection" to true,
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(1, result.size)
    assertEquals("cpmt_test123", result[0].id)
  }

  @Test
  fun parseCustomPaymentMethods_WithDisableBillingDetailCollectionFalse_ReturnsValidObject() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_test123",
              "disableBillingDetailCollection" to false,
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(1, result.size)
    assertEquals("cpmt_test123", result[0].id)
  }

  @Test
  fun parseCustomPaymentMethods_MultipleValidMethods_ReturnsAll() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_test1",
              "subtitle" to "Method 1",
            ),
            readableMapOf(
              "id" to "cpmt_test2",
              "subtitle" to "Method 2",
              "disableBillingDetailCollection" to true,
            ),
            readableMapOf(
              "id" to "cpmt_test3",
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(3, result.size)
    assertEquals("cpmt_test1", result[0].id)
    assertEquals("cpmt_test2", result[1].id)
    assertEquals("cpmt_test3", result[2].id)
  }

  @Test
  fun parseCustomPaymentMethods_MissingIdField_SkipsThatMethod() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_valid",
            ),
            readableMapOf(
              "subtitle" to "No ID here",
            ),
            readableMapOf(
              "id" to "cpmt_valid2",
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    // Only methods with id should be included
    assertEquals(2, result.size)
    assertEquals("cpmt_valid", result[0].id)
    assertEquals("cpmt_valid2", result[1].id)
  }

  @Test
  fun parseCustomPaymentMethods_NullIdField_SkipsThatMethod() {
    val params =
      readableMapOf(
        "customPaymentMethods" to
          readableArrayOf(
            readableMapOf(
              "id" to "cpmt_valid",
            ),
            readableMapOf(
              "id" to null,
              "subtitle" to "Null ID",
            ),
          ),
      )

    val result = parseCustomPaymentMethods(params)
    assertEquals(1, result.size)
    assertEquals("cpmt_valid", result[0].id)
  }

  // ============================================
  // mapToAddress Tests
  // ============================================

  @Test
  fun mapToAddress_NullInputs_ReturnsEmptyAddress() {
    val result = mapToAddress(null, null)
    assertNotNull(result)
    assertNull(result.city)
    assertNull(result.country)
    assertNull(result.line1)
    assertNull(result.line2)
    assertNull(result.postalCode)
    assertNull(result.state)
  }

  @Test
  fun mapToAddress_EmptyMap_ReturnsAddressWithEmptyStrings() {
    val result = mapToAddress(readableMapOf(), null)
    assertNotNull(result)
    assertEquals("", result.city)
    assertEquals("", result.country)
    assertEquals("", result.line1)
    assertEquals("", result.line2)
    assertEquals("", result.postalCode)
    assertEquals("", result.state)
  }

  @Test
  fun mapToAddress_FullAddress_ReturnsCompleteAddress() {
    val addressMap =
      readableMapOf(
        "city" to "San Francisco",
        "country" to "US",
        "line1" to "123 Main St",
        "line2" to "Apt 4",
        "postalCode" to "94111",
        "state" to "CA",
      )

    val result = mapToAddress(addressMap, null)
    assertEquals("San Francisco", result.city)
    assertEquals("US", result.country)
    assertEquals("123 Main St", result.line1)
    assertEquals("Apt 4", result.line2)
    assertEquals("94111", result.postalCode)
    assertEquals("CA", result.state)
  }

  @Test
  fun mapToAddress_PartialAddress_ReturnsPartialWithEmptyStrings() {
    val addressMap =
      readableMapOf(
        "city" to "New York",
        "postalCode" to "10001",
      )

    val result = mapToAddress(addressMap, null)
    assertEquals("New York", result.city)
    assertEquals("10001", result.postalCode)
    assertEquals("", result.country)
    assertEquals("", result.line1)
    assertEquals("", result.line2)
    assertEquals("", result.state)
  }

  @Test
  fun mapToAddress_CardAddressOnly_UsesCardAddress() {
    val cardAddress =
      com.stripe.android.model.Address
        .Builder()
        .setPostalCode("12345")
        .setCountry("CA")
        .build()

    val result = mapToAddress(null, cardAddress)
    assertEquals("12345", result.postalCode)
    assertEquals("CA", result.country)
  }

  @Test
  fun mapToAddress_BothInputs_CardOverridesMap() {
    val addressMap =
      readableMapOf(
        "postalCode" to "94111",
        "country" to "US",
      )

    val cardAddress =
      com.stripe.android.model.Address
        .Builder()
        .setPostalCode("12345")
        .setCountry("CA")
        .build()

    val result = mapToAddress(addressMap, cardAddress)
    // Card address overrides map values (card is checked after map is set)
    assertEquals("12345", result.postalCode)
    assertEquals("CA", result.country)
  }

  // ============================================
  // mapToBillingDetails Tests
  // ============================================

  @Test
  fun mapToBillingDetails_NullInputs_ReturnsNull() {
    val result = mapToBillingDetails(null, null)
    assertNull(result)
  }

  @Test
  fun mapToBillingDetails_EmptyMap_ReturnsBillingDetailsWithEmptyStrings() {
    val result = mapToBillingDetails(readableMapOf(), null)
    assertNotNull(result)
    assertEquals("", result!!.name)
    assertEquals("", result.email)
    assertEquals("", result.phone)
    assertNotNull(result.address)
  }

  @Test
  fun mapToBillingDetails_FullDetails_ReturnsComplete() {
    val billingMap =
      readableMapOf(
        "name" to "John Doe",
        "email" to "john@example.com",
        "phone" to "+1234567890",
        "address" to
          readableMapOf(
            "city" to "San Francisco",
            "country" to "US",
            "line1" to "123 Main St",
            "line2" to "Apt 4",
            "postalCode" to "94111",
            "state" to "CA",
          ),
      )

    val result = mapToBillingDetails(billingMap, null)
    assertNotNull(result)
    assertEquals("John Doe", result!!.name)
    assertEquals("john@example.com", result.email)
    assertEquals("+1234567890", result.phone)
    assertEquals("San Francisco", result.address?.city)
    assertEquals("US", result.address?.country)
    assertEquals("123 Main St", result.address?.line1)
    assertEquals("Apt 4", result.address?.line2)
    assertEquals("94111", result.address?.postalCode)
    assertEquals("CA", result.address?.state)
  }

  @Test
  fun mapToBillingDetails_OnlyName_ReturnsPartialWithEmptyStrings() {
    val billingMap =
      readableMapOf(
        "name" to "Jane Smith",
      )

    val result = mapToBillingDetails(billingMap, null)
    assertNotNull(result)
    assertEquals("Jane Smith", result!!.name)
    // Missing fields get empty string from getValOr default
    assertEquals("", result.email)
    assertEquals("", result.phone)
  }

  @Test
  fun mapToBillingDetails_OnlyEmail_ReturnsPartialWithEmptyStrings() {
    val billingMap =
      readableMapOf(
        "email" to "test@example.com",
      )

    val result = mapToBillingDetails(billingMap, null)
    assertNotNull(result)
    assertEquals("", result!!.name)
    assertEquals("test@example.com", result.email)
    assertEquals("", result.phone)
  }

  @Test
  fun mapToBillingDetails_OnlyPhone_ReturnsPartialWithEmptyStrings() {
    val billingMap =
      readableMapOf(
        "phone" to "+9876543210",
      )

    val result = mapToBillingDetails(billingMap, null)
    assertNotNull(result)
    assertEquals("", result!!.name)
    assertEquals("", result.email)
    assertEquals("+9876543210", result.phone)
  }

  @Test
  fun mapToBillingDetails_WithCardAddress_IncludesCardAddress() {
    val billingMap =
      readableMapOf(
        "name" to "John Doe",
      )

    val cardAddress =
      com.stripe.android.model.Address
        .Builder()
        .setPostalCode("12345")
        .setCountry("US")
        .build()

    val result = mapToBillingDetails(billingMap, cardAddress)
    assertNotNull(result)
    assertEquals("John Doe", result!!.name)
    assertEquals("12345", result.address?.postalCode)
    assertEquals("US", result.address?.country)
  }

  @Test
  fun mapToBillingDetails_EmptyStringValues_UsesEmptyStrings() {
    val billingMap =
      readableMapOf(
        "name" to "",
        "email" to "",
        "phone" to "",
      )

    val result = mapToBillingDetails(billingMap, null)
    assertNotNull(result)
    assertEquals("", result!!.name)
    assertEquals("", result.email)
    assertEquals("", result.phone)
  }

  @Test
  fun mapToBillingDetails_OnlyCardAddress_ReturnsBillingDetailsWithAddress() {
    val cardAddress =
      com.stripe.android.model.Address
        .Builder()
        .setPostalCode("90210")
        .setCountry("US")
        .build()

    val result = mapToBillingDetails(null, cardAddress)
    assertNotNull(result)
    assertNull(result!!.name)
    assertNull(result.email)
    assertNull(result.phone)
    assertEquals("90210", result.address?.postalCode)
    assertEquals("US", result.address?.country)
  }
}
