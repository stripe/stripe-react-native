import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import PaymentScreen from '../components/PaymentScreen';
import {
  AuBECSDebitForm,
  useConfirmPayment,
  AuBECSDebitFormComponent,
  PaymentIntent,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import { API_URL } from '../Config';

export default function AuBECSDebitPaymentScreen() {
  const [formDetails, setFormDetails] =
    useState<AuBECSDebitFormComponent.FormDetails>();
  const { confirmPayment, loading } = useConfirmPayment();
  const [canPay, setCanPay] = useState(true);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formDetails?.email,
        currency: 'aud',
        items: ['id-1'],
        payment_method_types: ['au_becs_debit'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const onPressPay = async () => {
    if (!formDetails) {
      return;
    }

    const clientSecret = await fetchPaymentIntentClientSecret();
    setCanPay(false);
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'AuBecsDebit',
      paymentMethodData: {
        formDetails,
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
    } else if (paymentIntent) {
      if (paymentIntent.status === PaymentIntent.Status.Processing) {
        Alert.alert(
          'Processing',
          `The debit has been successfully submitted and is now processing.`
        );
      } else if (paymentIntent.status === PaymentIntent.Status.Succeeded) {
        Alert.alert(
          'Success',
          `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
        );
      } else {
        Alert.alert('Payment status:', paymentIntent.status);
      }
    }
    setCanPay(true);
  };

  return (
    <PaymentScreen paymentMethod="au_becs_debit">
      <AuBECSDebitForm
        style={styles.form}
        onComplete={(value) => {
          console.log('Completed form', value);
          setFormDetails(value);
        }}
        companyName="company"
        formStyle={{ fontSize: 20 }}
      />

      <View style={styles.buttonContainer}>
        <Button
          disabled={!formDetails || !canPay}
          title="Pay"
          accessibilityLabel="Pay"
          variant="primary"
          onPress={onPressPay}
          loading={loading}
        />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: 30,
  },
  form: {
    width: '100%',
    height: 400,
  },
});
