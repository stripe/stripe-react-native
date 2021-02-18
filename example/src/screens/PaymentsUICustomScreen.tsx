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

  const setup = async () => {
    const {
      paymentIntent,
      ephemeralKey,
      customer,
    } = await fetchPaymentSheetParams();

    await setupPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      custom: true,
    });
    setPaymentSheetEnabled(true);
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
    setup();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <View>
        <Button
          variant="primary"
          loading={!paymentSheetEnabled}
          title="Choose payment method"
          onPress={choosePaymentOptions}
        />
      </View>
      <View style={styles.row}>
        <Image
          source={{ uri: `data:image/png;base64,${paymentMethod?.image}` }}
          style={styles.image}
        />

        <Text style={styles.paymentMethodTitle}>
          Payment method: {paymentMethod?.label || '-'}
        </Text>
      </View>
      <View style={styles.section}>
        <Button
          variant="primary"
          loading={!paymentSheetEnabled || loading}
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
    marginBottom: 20,
    marginTop: 10,
  },
  image: {
    width: 64,
    height: 64,
  },
});
