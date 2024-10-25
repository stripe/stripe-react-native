import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput } from 'react-native';
import {
  useStripe,
  // Address,
  // BillingDetails,
  PaymentMethod,
  PaymentSheet,
} from '@stripe/stripe-react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function PaymentSheetDeferredIntentMultiStepScreenWithUpdates() {
  const {
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
    updatePaymentSheet,
  } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethodOption, setPaymentMethodOption] = useState<{
    image: string;
    label: string;
  } | null>(null);

  const [amount, setAmount] = useState(6099);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { customer, ephemeralKey } = await response.json();

    return {
      customer,
      ephemeralKey,
    };
  };

  const initialisePaymentSheet = async () => {
    setLoading(true);

    try {
      const { customer, ephemeralKey } = await fetchPaymentSheetParams();

      const { error, paymentOption } = await initPaymentSheet({
        customFlow: true,
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        merchantDisplayName: 'Example Inc.',
        applePay: {
          merchantCountryCode: 'US',
        },
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: __DEV__,
        },
        returnURL: 'stripe-example://stripe-redirect',
        billingDetailsCollectionConfiguration: {
          attachDefaultsToPaymentMethod: true,
          name: PaymentSheet.CollectionMode.ALWAYS,
          address: PaymentSheet.AddressCollectionMode.NEVER,
        },
        intentConfiguration: {
          confirmHandler: async (
            paymentMethod: PaymentMethod.Result,
            _shouldSavePaymentMethod: boolean,
            intentCreationCallback: (
              result: PaymentSheet.IntentCreationCallbackParams
            ) => void
          ) => {
            const response = await fetch(
              `${API_URL}/payment-intent-for-payment-sheet`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  amount: amount,
                  currency: 'SEK',
                  paymentMethodId: paymentMethod.id,
                  customerId: customer,
                }),
              }
            );
            const { clientSecret, error: responseError } =
              await response.json();

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
            amount: amount,
            currencyCode: 'SEK',
          },
          paymentMethodTypes: ['card'],
        },
      });

      if (!error) {
        setPaymentSheetEnabled(true);
      } else {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
      if (paymentOption) {
        setPaymentMethodOption(paymentOption);
      }
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePayment = async () => {
    setLoading(true);

    try {
      const { customer } = await fetchPaymentSheetParams();

      const { error, paymentOption } = await updatePaymentSheet({
        confirmHandler: async (
          paymentMethod: PaymentMethod.Result,
          _shouldSavePaymentMethod: boolean,
          intentCreationCallback: (
            result: PaymentSheet.IntentCreationCallbackParams
          ) => void
        ) => {
          const response = await fetch(
            `${API_URL}/payment-intent-for-payment-sheet`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: amount,
                currency: 'SEK',
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
          amount: amount,
          currencyCode: 'SEK',
        },
      });

      if (!error) {
        setPaymentSheetEnabled(true);
      } else {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
      if (paymentOption) {
        setPaymentMethodOption(paymentOption);
      }
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  const choosePaymentOption = async () => {
    const { error, paymentOption } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentOption) {
      setPaymentMethodOption({
        label: paymentOption.label,
        image: paymentOption.image,
      });
    } else {
      setPaymentMethodOption(null);
    }
  };

  const onPressBuy = async () => {
    setLoading(true);
    const { error } = await confirmPaymentSheetPayment();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert('Success', 'The payment was confirmed successfully!');
      setPaymentSheetEnabled(false);
    }
    setLoading(false);
  };

  const onUpdatePress = async () => {
    setLoading(true);
    await updatePayment();
    setLoading(false);
  };

  return (
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    <PaymentScreen onInit={initialisePaymentSheet}>
      <Button
        variant="primary"
        loading={loading}
        title={'Choose payment method'}
        disabled={!paymentSheetEnabled}
        onPress={choosePaymentOption}
      />

      <View style={styles.section}>
        <TextInput
          style={styles.input}
          value={String(amount)}
          onChangeText={(txt) => setAmount(parseInt(txt, 10) || 0)}
        />
      </View>

      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentSheetEnabled}
          title="Update Payment"
          onPress={onUpdatePress}
        />
      </View>

      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentMethodOption || !paymentSheetEnabled}
          title={`Buy${
            paymentMethodOption ? ` with ${paymentMethodOption.label}` : ''
          }`}
          onPress={onPressBuy}
        />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate,
    padding: 10,
    borderRadius: 6,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  paymentMethodTitle: {
    color: colors.slate,
    fontWeight: 'bold',
  },
  image: {
    width: 26,
    height: 20,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});
