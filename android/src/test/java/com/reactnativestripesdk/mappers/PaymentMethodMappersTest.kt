package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.stripe.android.model.CardBrand
import com.stripe.android.model.PaymentMethod
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class PaymentMethodMappersTest {
  @Test
  fun mapFromPaymentMethod_CardWithNetworks_MapsAvailableNetworks() {
    val paymentMethod =
      PaymentMethod
        .Builder()
        .setId("pm_test123")
        .setType(PaymentMethod.Type.Card)
        .setCard(
          PaymentMethod.Card(
            brand = CardBrand.Discover,
            networks = PaymentMethod.Card.Networks(available = setOf("discover")),
          ),
        ).build()

    val result = mapFromPaymentMethod(paymentMethod)
    val availableNetworks = result.getMap("Card")?.getArray("availableNetworks")

    assertNotNull(availableNetworks)
    assertEquals(1, availableNetworks!!.size())
    assertEquals("discover", availableNetworks.getString(0))
  }

  @Test
  fun mapFromPaymentMethod_CardWithoutNetworks_AvailableNetworksIsNull() {
    val paymentMethod =
      PaymentMethod
        .Builder()
        .setId("pm_test123")
        .setType(PaymentMethod.Type.Card)
        .setCard(PaymentMethod.Card(brand = CardBrand.Visa))
        .build()

    val result = mapFromPaymentMethod(paymentMethod)

    assertNull(result.getMap("Card")?.getArray("availableNetworks"))
  }

  @Test
  fun mapFromPaymentMethod_USBankAccountWithNetworks_MapsSupportedNetworks() {
    val paymentMethod =
      PaymentMethod
        .Builder()
        .setId("pm_test123")
        .setType(PaymentMethod.Type.USBankAccount)
        .setUSBankAccount(
          PaymentMethod.USBankAccount(
            accountHolderType = PaymentMethod.USBankAccount.USBankAccountHolderType.INDIVIDUAL,
            accountType = PaymentMethod.USBankAccount.USBankAccountType.CHECKING,
            bankName = null,
            fingerprint = null,
            last4 = null,
            financialConnectionsAccount = null,
            networks =
              PaymentMethod.USBankAccount.USBankNetworks(
                preferred = "ach",
                supported = listOf("ach"),
              ),
            routingNumber = null,
          ),
        ).build()

    val result = mapFromPaymentMethod(paymentMethod)
    val supportedNetworks = result.getMap("USBankAccount")?.getArray("supportedNetworks")

    assertNotNull(supportedNetworks)
    assertEquals(1, supportedNetworks!!.size())
    assertEquals("ach", supportedNetworks.getString(0))
  }

  @Test
  fun mapFromPaymentMethod_USBankAccountWithoutNetworks_SupportedNetworksIsNull() {
    val paymentMethod =
      PaymentMethod
        .Builder()
        .setId("pm_test123")
        .setType(PaymentMethod.Type.USBankAccount)
        .setUSBankAccount(
          PaymentMethod.USBankAccount(
            accountHolderType = PaymentMethod.USBankAccount.USBankAccountHolderType.INDIVIDUAL,
            accountType = PaymentMethod.USBankAccount.USBankAccountType.CHECKING,
            bankName = null,
            fingerprint = null,
            last4 = null,
            financialConnectionsAccount = null,
            networks = null,
            routingNumber = null,
          ),
        ).build()

    val result = mapFromPaymentMethod(paymentMethod)

    assertNull(result.getMap("USBankAccount")?.getArray("supportedNetworks"))
  }
}
