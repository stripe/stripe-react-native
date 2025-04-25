/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Alert, View, Text } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';
import { API_URL } from '../Config';
import type {
  IntentConfiguration,
  EmbeddedPaymentElementConfiguration,
  AddressDetails,
  BillingDetails,
  Address,
  IntentCreationCallbackParams,
  PaymentMethod,
  EmbeddedPaymentElementResult,
} from '@stripe/stripe-react-native';
import {
  useEmbeddedPaymentElement,
  AppearanceParams,
  RowStyle,
} from '@stripe/stripe-react-native';

export default function EmbeddedPaymentElementScreen() {
  // Local UI state
  const [loading, setLoading] = React.useState(false);
  const [customerKeyType, setCustomerKeyType] = React.useState<
    'legacy_ephemeral_key' | 'customer_session'
  >('legacy_ephemeral_key');

  // Hold configs once initialized
  const [intentConfig, setIntentConfig] =
    React.useState<IntentConfiguration | null>(null);
  const [elementConfig, setElementConfig] =
    React.useState<EmbeddedPaymentElementConfiguration | null>(null);

  // Fetch secrets and customer ID
  const fetchPaymentSheetParams = async (keyType: string) => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_key_type: keyType }),
    });
    const json = await response.json();
    if (keyType === 'customer_session') {
      return {
        customer: json.customer,
        clientSecretKey: json.customerSessionClientSecret,
      };
    }
    return { customer: json.customer, clientSecretKey: json.ephemeralKey };
  };

  // Initialize Stripe element configs
  const initialize = React.useCallback(
    async (shippingDetails?: AddressDetails) => {
      const { customer } = await fetchPaymentSheetParams(customerKeyType);

      const address: Address = {
        city: 'San Francisco',
        country: 'AT',
        line1: '510 Townsend St.',
        line2: 'Suite 123',
        postalCode: '94102',
        state: 'CA',
      };
      const billingDetails: BillingDetails = {
        name: 'Jane Doe',
        email: 'foo@bar.com',
        phone: '555-555-5555',
        address,
      };

      const actionPink = '#EA0B8C'; // A vibrant pink color
      const brandWhite = '#FFFFFF';
      const lightGrayBg = '#F5F5F5'; // Backgrounds
      const mediumGrayUI = '#BDBDBD'; // Borders, placeholders
      const darkGrayText = '#6B6B6B'; // Secondary text (light mode)
      const nearBlackBg = '#1C1C1E'; // Dark mode background / Light mode primary text
      const nearWhiteText = '#E0E0E0'; // Dark mode primary text / Light mode backgrounds
      const darkComponentBg = '#2C2C2E'; // Dark mode component background
      const darkBorderColor = '#48484A'; // Dark mode border
      const darkSecondaryText = '#8E8E93'; // Dark mode secondary text

      const appearance: AppearanceParams = {
        colors: {
          light: {
            primary: actionPink,
            background: brandWhite,
            componentBackground: lightGrayBg,
            componentBorder: mediumGrayUI,
            componentDivider: mediumGrayUI,
            primaryText: nearBlackBg,
            secondaryText: darkGrayText,
            componentText: nearBlackBg,
            placeholderText: mediumGrayUI,
            icon: darkGrayText,
            error: '#FF3B30', // Standard iOS red
          },
          dark: {
            primary: actionPink,
            background: nearBlackBg,
            componentBackground: darkComponentBg,
            componentBorder: darkBorderColor,
            componentDivider: darkBorderColor,
            primaryText: nearWhiteText,
            secondaryText: darkSecondaryText,
            componentText: nearWhiteText,
            placeholderText: darkSecondaryText, // Using secondary for better visibility
            icon: darkSecondaryText,
            error: '#FF453A', // Standard iOS dark red
          },
        },
        shapes: {
          borderRadius: 8, // Moderate rounding
          borderWidth: 1.0, // Standard subtle border
          shadow: {
            // Subtle shadow for elevation
            color: '#000000',
            opacity: 0.1,
            offset: { x: 0, y: 2 },
            blurRadius: 4,
          },
        },
        primaryButton: {
          shapes: {
            borderRadius: 8,
            borderWidth: 0,
          },
          colors: {
            light: {
              background: actionPink,
              text: brandWhite, // White text on pink
              border: '00000000', // No border color needed
            },
            dark: {
              background: actionPink,
              text: brandWhite, // White text on pink
              border: '#00000000', // No border color needed
            },
          },
        },
        embeddedPaymentElement: {
          row: {
            style: RowStyle.FloatingButton,
            flat: {
              separatorColor: { light: '#FF0000', dark: '#0000FF' },
              checkmark: { color: { light: '#FF0000', dark: '#0000FF' } },
              radio: {
                selectedColor: { light: '#FF0000', dark: '#0000FF' },
                unselectedColor: { light: '#FF0000', dark: '#0000FF' },
              },
            },
          },
        },
      };

      // 4. Element UI config
      const uiConfig: EmbeddedPaymentElementConfiguration = {
        merchantDisplayName: 'Example Inc.',
        returnURL: 'stripe-example://stripe-redirect',
        customerId: customer,
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        allowsDelayedPaymentMethods: true,
        formSheetAction: {
          type: 'confirm',
          onFormSheetConfirmComplete: (
            result: EmbeddedPaymentElementResult
          ) => {
            if (result.status === 'completed')
              Alert.alert('Success', 'Payment confirmed');
            else if (result.status === 'failed')
              Alert.alert('Error', `Failed: ${result.error.message}`);
            else Alert.alert('Cancelled');
          },
        },
        appearance,
      };

      // 5. Intent config
      const newIntentConfig: IntentConfiguration = {
        confirmHandler: async (
          paymentMethod: PaymentMethod.Result,
          _save,
          callback: (res: IntentCreationCallbackParams) => void
        ) => {
          const resp = await fetch(
            `${API_URL}/payment-intent-for-payment-sheet`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentMethodId: paymentMethod.id,
                customerId: customer,
              }),
            }
          );
          const { clientSecret, error } = await resp.json();
          if (error)
            callback({
              error: {
                code: 'Failed',
                message: error.raw.message,
                localizedMessage: error.raw.message,
              },
            });
          else callback({ clientSecret });
        },
        mode: { amount: 6099, currencyCode: 'USD' },
        paymentMethodTypes: ['card', 'klarna', 'cashapp'],
      };

      setElementConfig(uiConfig);
      setIntentConfig(newIntentConfig);
    },
    [customerKeyType]
  );

  // Hook into Stripe element
  const {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    clearPaymentOption,
    loadingError,
  } = useEmbeddedPaymentElement(intentConfig!, elementConfig!);

  // Payment action
  const handlePay = React.useCallback(async () => {
    setLoading(true);
    await confirm();
    setLoading(false);
  }, [confirm]);

  return (
    <PaymentScreen onInit={initialize}>
      <CustomerSessionSwitch
        value={customerKeyType === 'customer_session'}
        onValueChange={(val) =>
          setCustomerKeyType(val ? 'customer_session' : 'legacy_ephemeral_key')
        }
      />

      {loadingError && (
        <View style={{ padding: 12, backgroundColor: '#fee', margin: 8 }}>
          <Text style={{ color: '#900', fontWeight: '600' }}>
            Failed to load payment form:
          </Text>
          <Text style={{ color: '#900' }}>{loadingError.message}</Text>
        </View>
      )}

      {embeddedPaymentElementView}

      <View style={{ paddingVertical: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>
          {paymentOption?.label ?? 'No option'}
        </Text>
      </View>

      <Button
        variant="primary"
        title="Pay"
        onPress={handlePay}
        loading={loading}
        disabled={!paymentOption}
      />
      <Button
        variant="default"
        title="Clear"
        onPress={clearPaymentOption}
        disabled={!paymentOption}
      />
    </PaymentScreen>
  );
}
