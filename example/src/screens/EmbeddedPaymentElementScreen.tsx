/* eslint-disable react-native/no-inline-styles */
import React, { useState, useCallback, useEffect } from 'react';
import { Alert, View, Text, Image } from 'react-native';
import {
  AddressDetails,
  BillingDetails,
  Address,
  IntentConfiguration,
  createEmbeddedPaymentElement,
  EmbeddedPaymentElement,
  EmbeddedPaymentElementView,
  EmbeddedPaymentElementConfiguration,
  IntentCreationCallbackParams,
  PaymentMethod,
  onEmbeddedPaymentElementDidUpdatePaymentOption,
  PaymentOptionDisplayData,
  EmbeddedPaymentElementResult,
} from '@stripe/stripe-react-native';
import { AppearanceParams, RowStyle } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';

export default function EmbeddedPaymentElementScreen() {
  const [embeddedElement, setEmbeddedElement] =
    useState<EmbeddedPaymentElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerKeyType, setCustomerKeyType] = useState<string>(
    'legacy_ephemeral_key'
  );
  const [paymentOption, setPaymentOption] =
    useState<PaymentOptionDisplayData | null>(null);

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
      const { customerSessionClientSecret, customer } = await response.json();
      return {
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { ephemeralKey, customer } = await response.json();
      return {
        ephemeralKey,
        customer,
      };
    }
  };

  const handlePayment = async () => {
    if (!embeddedElement) return;
    setLoading(true);
    const result = await embeddedElement.confirm();
    setLoading(false);

    if (result.status === 'completed') {
      Alert.alert('Success', 'The payment was confirmed successfully');
    } else if (result.status === 'failed') {
      Alert.alert('Error', `Payment failed: ${result.error.message}`);
    } else {
      Alert.alert('Cancelled', 'The payment was cancelled');
    }
  };

  const initialiseEmbeddedPaymentElement = useCallback(
    async (shippingDetails?: AddressDetails) => {
      const { customer, ...remainingParams } =
        await fetchPaymentSheetParams(customerKeyType);

      // const clientSecretParams = getClientSecretParams(
      //   customerKeyType,
      //   remainingParams
      // );
      console.log(remainingParams);

      const address: Address = {
        city: 'San Francisco',
        country: 'AT',
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

      const modernPinkAppearance: AppearanceParams = {
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
            floating: {
              spacing: 12,
            },
          },
        },
      };

      const config: EmbeddedPaymentElementConfiguration = {
        merchantDisplayName: 'Example Inc.',
        returnURL: 'stripe-example://stripe-redirect',
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        allowsDelayedPaymentMethods: true,
        customerId: customer,
        formSheetAction: {
          type: 'confirm',
          onFormSheetConfirmComplete: (
            result: EmbeddedPaymentElementResult
          ) => {
            if (result.status === 'completed') {
              Alert.alert('Success', 'The payment was confirmed successfully');
            } else if (result.status === 'failed') {
              Alert.alert('Error', `Payment failed: ${result.error.message}`);
            } else {
              Alert.alert('Cancelled', 'The payment was cancelled');
            }
          },
        },
        rowSelectionBehavior: {
          type: 'immediateAction',
          didSelectPaymentOption: () => {
            console.log('Did change');
          },
        },
        appearance: modernPinkAppearance,
      };

      const intentConfig: IntentConfiguration = {
        confirmHandler: async (
          paymentMethod: PaymentMethod.Result,
          _shouldSavePaymentMethod: boolean,
          intentCreationCallback: (result: IntentCreationCallbackParams) => void
        ) => {
          const response = await fetch(
            `${API_URL}/payment-intent-for-payment-sheet`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentMethodId: paymentMethod.id,
                customerId: customer,
              }),
            }
          );
          const { clientSecret, error: responseError } = await response.json();

          if (responseError) {
            intentCreationCallback({
              error: {
                code: 'Failed',
                message: responseError.raw.message,
                localizedMessage: responseError.raw.message,
              },
            });
          } else {
            intentCreationCallback({ clientSecret });
          }
        },
        mode: {
          amount: 6099,
          currencyCode: 'USD',
        },
        paymentMethodTypes: ['card', 'klarna'],
      };

      try {
        const element = await createEmbeddedPaymentElement(
          intentConfig,
          config
        );
        setEmbeddedElement(element);
      } catch (error) {
        console.error('Failed to initialize Embedded Payment Element:', error);
        Alert.alert('Error', 'Failed to initialize payment element');
      }
    },
    [customerKeyType]
  );

  const toggleCustomerKeyType = (value: boolean) => {
    setCustomerKeyType(value ? 'customer_session' : 'legacy_ephemeral_key');
  };

  useEffect(() => {
    const paymentOptionSubscription =
      onEmbeddedPaymentElementDidUpdatePaymentOption((event) => {
        if (event.paymentOption) {
          setPaymentOption(event.paymentOption as PaymentOptionDisplayData);
        } else {
          setPaymentOption(null);
        }
      });

    // Cleanup: remove the subscription when unmounted
    return () => {
      paymentOptionSubscription.remove();
    };
  }, [customerKeyType]);

  return (
    <PaymentScreen onInit={initialiseEmbeddedPaymentElement}>
      <CustomerSessionSwitch
        value={customerKeyType === 'customer_session'}
        onValueChange={toggleCustomerKeyType}
      />
      {embeddedElement && (
        <EmbeddedPaymentElementView
          style={{ width: '100%', marginVertical: 16 }}
        />
      )}
      {paymentOption && (
        <View style={{ paddingBottom: 16 }}>
          {paymentOption.image && (
            <Image
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
              source={{
                uri: `data:image/png;base64,${paymentOption.image}`,
              }}
            />
          )}
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
            {paymentOption.label}
          </Text>
        </View>
      )}
      <Button
        variant="primary"
        loading={loading}
        disabled={!embeddedElement}
        title={embeddedElement && !loading ? 'Pay' : 'Loading...'}
        onPress={handlePayment}
      />
    </PaymentScreen>
  );
}
