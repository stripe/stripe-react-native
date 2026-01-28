import {
  Address,
  AddressDetails,
  AddressSheet,
  AddressSheetError,
  BillingDetails,
  CardBrand,
  CustomPaymentMethod,
  CustomPaymentMethodResult,
  CustomPaymentMethodResultStatus,
  PaymentMethodLayout,
  PaymentSheetError,
  useStripe,
} from '@stripe/stripe-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Button from '../components/Button';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { getClientSecretParams } from '../helpers';
import {
  appearance,
  liquidGlassAppearance,
  liquidGlassNavigationOnlyAppearance,
  customAppearance,
} from './PaymentSheetAppearance';
import { Platform, View, Text, TouchableOpacity, Switch } from 'react-native';

enum AppearanceSettings {
  default = `default`,
  glass = 'glass',
  glassNavigation = 'glassNavigation',
  custom = 'custom',
}

export default function PaymentsUICompleteScreen() {
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } =
    useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>(AppearanceSettings.default);
  const [clientSecret, setClientSecret] = useState<string>();

  const [customerKeyType, setCustomerKeyType] = useState<string>(
    'legacy_ephemeral_key'
  );
  const [opensCardScannerAutomatically, setOpensCardScannerAutomatically] =
    useState(false);

  const fetchPaymentSheetParams = async (customer_key_type: string) => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_key_type,
      }),
    });

    if (customer_key_type === 'customer_session') {
      const { paymentIntent, customerSessionClientSecret, customer } =
        await response.json();
      setClientSecret(paymentIntent);
      return {
        paymentIntent,
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { paymentIntent, ephemeralKey, customer } = await response.json();
      setClientSecret(paymentIntent);
      return {
        paymentIntent,
        ephemeralKey,
        customer,
      };
    }
  };
  const openPaymentSheet = async () => {
    if (!clientSecret) {
      return;
    }
    setLoading(true);
    const { error } = await presentPaymentSheet();

    if (!error) {
      Alert.alert('Success', 'The payment was confirmed successfully');
    } else {
      switch (error.code) {
        case PaymentSheetError.Failed:
          Alert.alert(
            `PaymentSheet present failed with error code: ${error.code}`,
            error.message
          );
          setPaymentSheetEnabled(false);
          break;
        case PaymentSheetError.Canceled:
          Alert.alert(
            `PaymentSheet present was canceled with code: ${error.code}`,
            error.message
          );
          break;
        case PaymentSheetError.Timeout:
          Alert.alert(
            `PaymentSheet present timed out: ${error.code}`,
            error.message
          );
          break;
      }
    }
    setLoading(false);
  };

  const getAppearanceForSetting = (setting: AppearanceSettings) => {
    switch (setting) {
      case AppearanceSettings.default:
        return appearance;
      case AppearanceSettings.glass:
        return liquidGlassAppearance;
      case AppearanceSettings.glassNavigation:
        return liquidGlassNavigationOnlyAppearance;
      case AppearanceSettings.custom:
        return customAppearance;
    }
  };

  const initialisePaymentSheet = useCallback(
    async (shippingDetails?: AddressDetails) => {
      const { paymentIntent, customer, ...remainingParams } =
        await fetchPaymentSheetParams(customerKeyType);

      const clientSecretParams = getClientSecretParams(
        customerKeyType,
        remainingParams
      );

      const address: Address = {
        city: 'San Francisco',
        country: 'US',
        line1: '510 Townsend St.',
        line2: '123 Street',
        postalCode: '94102',
        state: 'California',
      };
      const billingDetails: BillingDetails = {
        name: 'Jane Doe',
        email: 'foo@bar.com',
        phone: '555-555-555',
        address: address,
      };

      const { error } = await initPaymentSheet({
        customerId: customer,
        paymentIntentClientSecret: paymentIntent,
        customFlow: false,
        merchantDisplayName: 'Example Inc.',
        applePay: { merchantCountryCode: 'US' },
        style: 'automatic',
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: true,
        },
        returnURL: 'com.stripe.react.native://stripe-redirect',
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        allowsDelayedPaymentMethods: true,
        appearance: getAppearanceForSetting(appearanceSettings),
        primaryButtonLabel: 'purchase!',
        paymentMethodLayout: PaymentMethodLayout.Automatic,
        removeSavedPaymentMethodMessage: 'remove this payment method?',
        preferredNetworks: [CardBrand.Amex, CardBrand.Visa],
        opensCardScannerAutomatically,
        customPaymentMethodConfiguration: {
          customPaymentMethods: [
            {
              id: 'cpmt_1RlDWcCWPdGs21gLuSlYP6FB', // The requested custom payment method ID
              subtitle: 'Demo custom payment method',
              disableBillingDetailCollection: false,
            },
          ],
          confirmCustomPaymentMethodCallback: (
            customPaymentMethod: CustomPaymentMethod,
            cpmBillingDetails: BillingDetails | null,
            confirmHandler: (result: CustomPaymentMethodResult) => void
          ) => {
            // Show an alert to simulate custom payment method processing
            Alert.alert(
              'Custom Payment Method',
              `Processing payment with ${customPaymentMethod.id}`,
              [
                {
                  text: 'Success',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Completed,
                    }),
                },
                {
                  text: 'Fail',
                  style: 'destructive',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Failed,
                      error: 'Custom payment failed',
                    }),
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Canceled,
                    }),
                },
              ]
            );
          },
        },
        ...clientSecretParams,
      });
      if (!error) {
        setPaymentSheetEnabled(true);
      } else if (error.code === PaymentSheetError.Failed) {
        Alert.alert(
          `PaymentSheet init failed with error code: ${error.code}`,
          error.message
        );
      } else if (error.code === PaymentSheetError.Canceled) {
        Alert.alert(
          `PaymentSheet init was canceled with code: ${error.code}`,
          error.message
        );
      }
    },
    [
      customerKeyType,
      appearanceSettings,
      opensCardScannerAutomatically,
      initPaymentSheet,
    ]
  );

  const toggleCustomerKeyType = (value: boolean) => {
    if (value) {
      setCustomerKeyType('customer_session');
    } else {
      setCustomerKeyType('legacy_ephemeral_key');
    }
  };

  useEffect(() => {
    setPaymentSheetEnabled(false);
    initialisePaymentSheet().catch((err) => console.log(err));
  }, [customerKeyType, initialisePaymentSheet]);

  return (
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    <PaymentScreen>
      <Button
        variant="default"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title="Add shipping"
        onPress={() => {
          setTimeout(function () {
            setAddressSheetVisible(false);
          }, 5000);
          setAddressSheetVisible(true);
        }}
      />
      <CustomerSessionSwitch
        onValueChange={toggleCustomerKeyType}
        value={customerKeyType === 'customer_session'}
      />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <Text style={{ marginEnd: 10, textAlignVertical: 'center' }}>
          Opens card scanner automatically
        </Text>
        <Switch
          value={opensCardScannerAutomatically}
          onValueChange={setOpensCardScannerAutomatically}
        />
      </View>
      {Platform.OS === 'ios' && (
        <View style={{ marginVertical: 10 }}>
          <Text style={{ marginBottom: 8, fontWeight: '500', marginLeft: 10 }}>
            Appearance Style
          </Text>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              overflow: 'hidden',
            }}
          >
            {[
              { title: 'Default', value: AppearanceSettings.default },
              { title: 'Glass', value: AppearanceSettings.glass },
              { title: 'Glass Nav', value: AppearanceSettings.glassNavigation },
              { title: 'Custom', value: AppearanceSettings.custom },
            ].map((option) => (
              <TouchableOpacity
                key={option.title}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor:
                    appearanceSettings === option.value
                      ? '#007AFF'
                      : 'transparent',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setAppearanceSettings(option.value);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color:
                      appearanceSettings === option.value ? 'white' : '#333',
                    fontWeight:
                      appearanceSettings === option.value ? '600' : 'normal',
                  }}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title={
          paymentSheetEnabled && !loading
            ? 'Checkout'
            : 'Fetching payment intent...'
        }
        onPress={openPaymentSheet}
      />
      <Button
        variant="primary"
        loading={loading}
        disabled={!paymentSheetEnabled}
        title={
          paymentSheetEnabled && !loading
            ? 'trigger payment sheet timeout'
            : 'Fetching payment intent...'
        }
        onPress={async () => {
          if (!clientSecret) {
            return;
          }
          setLoading(true);
          const { error } = await presentPaymentSheet({ timeout: 5000 });
          if (error) {
            Alert.alert(`${error.code}`, error.message);
          }
          setLoading(false);
        }}
      />
      <AddressSheet
        visible={addressSheetVisible}
        onSubmit={async (result) => {
          setPaymentSheetEnabled(false);
          setAddressSheetVisible(false);
          console.log(JSON.stringify(result, null, 2));
          await initialisePaymentSheet(result);
        }}
        onError={(err) => {
          if (err.code === AddressSheetError.Failed) {
            Alert.alert('There was an error.', 'Check the logs for details.');
            console.log(err?.localizedMessage);
          }
          setAddressSheetVisible(false);
        }}
        presentationStyle={'popover'}
        animationStyle={'flip'}
        appearance={{}}
        defaultValues={{
          name: 'Michael Scott',
          phone: '111-222-3333',
          isCheckboxSelected: true,
          address: {
            country: 'United States',
            line1: 'Dunder Mifflin',
            postalCode: '12345',
            city: 'Scranton',
          },
        }}
        additionalFields={{
          phoneNumber: 'required',
          checkboxLabel: 'Send me lots of emails',
        }}
        // allowedCountries={['US', 'CA']}
        // autocompleteCountries={['CA']}
        primaryButtonTitle={'use this address'}
        sheetTitle={'🧙‍♀️ custom title'}
        googlePlacesApiKey={'this-api-key-wont-work'}
      />
      <Button
        title="Reset customer"
        onPress={async () => {
          // Link will still be presented for the customer if you pass in the customer ID and ephemeral key to payment sheet
          await resetPaymentSheetCustomer();
        }}
      />
    </PaymentScreen>
  );
}
