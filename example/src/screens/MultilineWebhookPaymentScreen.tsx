import type {
  CardFormView,
  PaymentMethodCreateParams,
} from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Platform,
} from 'react-native';
import { CardForm, useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function MultilineWebhookPaymentScreen() {
  const [email, setEmail] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isComplete, setComplete] = useState(false);

  const { confirmPayment, loading } = useConfirmPayment();

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currency: 'usd',
        items: [{ id: 'id' }],
        // request_three_d_secure: 'any',
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    // 1. fetch Intent Client Secret from backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    // 2. Gather customer billing information (ex. email)
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    }; // mocked data for tests

    // 3. Confirm payment with card details
    // The rest will be done automatically using webhooks
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Card',
      billingDetails,
      setupFutureUsage: saveCard ? 'OffSession' : undefined,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Payment confirmation error', error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
      console.log('Success from promise', paymentIntent);
    }
  };

  return (
    <PaymentScreen>
      <TextInput
        autoCapitalize="none"
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <CardForm
        autofocus
        cardStyle={inputStyles}
        style={styles.cardField}
        onFormComplete={(cardDetails) => {
          console.log(cardDetails);
          setComplete(cardDetails.complete);
        }}
      />
      <View style={styles.row}>
        <Switch
          onValueChange={(value) => setSaveCard(value)}
          value={saveCard}
        />
        <Text style={styles.text}>Save card during payment</Text>
      </View>
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        disabled={!isComplete}
        loading={loading}
      />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    ...Platform.select({
      ios: {
        height: 250,
      },
      android: {
        height: 320,
      },
    }),
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  text: {
    marginLeft: 12,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
  },
});

const inputStyles: CardFormView.Styles = {
  backgroundColor: '#FFFFFF',
};
