import type {
  CardFieldInput,
  PaymentMethodCreateParams,
} from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function WebhookPaymentScreen() {
  const [email, setEmail] = useState('');
  const [saveCard, setSaveCard] = useState(false);

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
      <CardField
        postalCodeEnabled={false}
        autofocus
        placeholder={{
          number: '4242 4242 4242 4242',
          postalCode: '12345',
          cvc: 'CVC',
          expiration: 'MM|YY',
        }}
        onCardChange={(cardDetails) => {
          console.log('cardDetails', cardDetails);
        }}
        onFocus={(focusedField) => {
          console.log('focusField', focusedField);
        }}
        cardStyle={inputStyles}
        style={styles.cardField}
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
        loading={loading}
      />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
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

const inputStyles: CardFieldInput.Styles = {
  borderWidth: 1,
  backgroundColor: '#FFFFFF',
  borderColor: '#000000',
  borderRadius: 8,
  fontSize: 14,
  placeholderColor: '#999999',
};
