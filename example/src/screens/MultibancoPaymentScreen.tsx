import { PaymentIntent, useConfirmPayment } from '@stripe/stripe-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

type MultibancoVoucherDetails = {
  voucherURL?: string;
  entity?: string;
  reference?: string;
  expiresAt?: number;
};

export default function MultibancoPaymentScreen() {
  const [email, setEmail] = useState('');
  const [voucherDetails, setVoucherDetails] =
    useState<MultibancoVoucherDetails | null>(null);
  const { confirmPayment, loading } = useConfirmPayment();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'eur',
        items: ['id-1'],
        payment_method_types: ['multibanco'],
      }),
    });
    const { clientSecret, error } = await response.json();

    return { clientSecret, error };
  };

  const formattedExpiration = useMemo(() => {
    if (!voucherDetails?.expiresAt) {
      return null;
    }

    return new Date(voucherDetails.expiresAt * 1000).toLocaleString();
  }, [voucherDetails?.expiresAt]);

  const handlePayPress = async () => {
    setVoucherDetails(null);

    const { clientSecret, error: clientSecretError } =
      await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Multibanco',
      paymentMethodData: {
        billingDetails: {
          name: 'John Doe',
          email,
        },
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
      return;
    }

    if (!paymentIntent) {
      return;
    }

    if (
      paymentIntent.status === PaymentIntent.Status.RequiresAction &&
      paymentIntent.nextAction?.type === 'multibanco'
    ) {
      setVoucherDetails({
        voucherURL: paymentIntent.nextAction.voucherURL,
        entity: paymentIntent.nextAction.entity,
        reference: paymentIntent.nextAction.reference,
        expiresAt: paymentIntent.nextAction.expiresAt,
      });
      Alert.alert(
        'Success',
        'The Multibanco voucher was created successfully. Awaiting payment from customer.'
      );
    } else {
      Alert.alert('Payment intent status:', paymentIntent.status);
    }
  };

  return (
    <PaymentScreen paymentMethod="multibanco">
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />

      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Create voucher"
        accessibilityLabel="Create voucher"
        loading={loading}
      />

      {voucherDetails && (
        <View style={styles.voucherContainer}>
          <Text style={styles.voucherTitle}>Multibanco voucher details</Text>
          <Text style={styles.voucherText}>
            Hosted voucher URL: {voucherDetails.voucherURL ?? 'Unavailable'}
          </Text>
          <Text style={styles.voucherText}>
            Entity: {voucherDetails.entity ?? 'Unavailable on this platform'}
          </Text>
          <Text style={styles.voucherText}>
            Reference:{' '}
            {voucherDetails.reference ?? 'Unavailable on this platform'}
          </Text>
          <Text style={styles.voucherText}>
            Expires at: {formattedExpiration ?? 'Unavailable on this platform'}
          </Text>
        </View>
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
    marginBottom: 20,
  },
  voucherContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.light_gray,
  },
  voucherTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.blurple_dark,
  },
  voucherText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark_gray,
    marginBottom: 8,
  },
});
