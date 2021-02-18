import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useStripe } from 'stripe-react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { API_URL } from '../Config';

export default function PaymentsUICustomScreen() {
  const {
    setupPaymentSheet,
    presentPaymentOptions,
    paymentSheetConfirmPayment,
  } = useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    image: string;
    label: string;
  } | null>(null);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { paymentIntent, ephemeralKey, customer } = await response.json();

    return {
      paymentIntent,
      ephemeralKey,
      customer,
    };
  };

  const initializePaymentSheet = async () => {
    setLoading(true);

    try {
      const {
        paymentIntent,
        ephemeralKey,
        customer,
      } = await fetchPaymentSheetParams();

      await setupPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        customFlow: true,
        merchantDisplayName: 'Example Inc.',
        applePay: true,
        merchantCountryCode: 'US',
      });

      setPaymentSheetEnabled(true);
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  const choosePaymentOptions = async () => {
    const res = await presentPaymentOptions();

    if (res) {
      setPaymentMethod({ label: res.label, image: res.image });
    } else {
      setPaymentMethod(null);
    }
  };

  const onPressBuy = async () => {
    try {
      setLoading(true);
      const res = await paymentSheetConfirmPayment();

      initializePaymentSheet();
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! amount: ${res.amount}`
      );
    } catch (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    initializePaymentSheet();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <View>
        <Button
          variant="primary"
          loading={loading}
          title="Choose payment method"
          disabled={!paymentSheetEnabled}
          onPress={choosePaymentOptions}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.paymentMethodTitle}>Payment method:</Text>
        {paymentMethod && (
          <Image
            source={{ uri: `data:image/png;base64,${paymentMethod?.image}` }}
            style={styles.image}
          />
        )}
        <Text>{paymentMethod?.label || ' -'}</Text>
      </View>
      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentMethod}
          title="Buy"
          onPress={onPressBuy}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  section: {
    marginBottom: 40,
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
    width: 32,
    height: 32,
  },
});
