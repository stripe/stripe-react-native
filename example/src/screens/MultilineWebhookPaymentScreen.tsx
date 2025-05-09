import type { CardFormView, BillingDetails } from '@stripe/stripe-react-native';
import React, { useRef, useState } from 'react';
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
  const [inputDisabled, setInputDisabled] = useState(false);
  const ref = useRef<CardFormView.Methods>(null);

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
        items: ['id-1'],
        // request_three_d_secure: 'any',
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    setComplete(false);
    setInputDisabled(true);
    // 1. fetch Intent Client Secret from backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    // 2. Gather customer billing information (ex. email)
    const billingDetails: BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      address: {
        city: 'Houston',
        country: 'US',
        line1: '1459  Circle Drive',
        line2: 'Texas',
        postalCode: '77063',
      },
    }; // mocked data for tests

    // 3. Confirm payment with card details
    // The rest will be done automatically using webhooks
    const { error, paymentIntent } = await confirmPayment(
      clientSecret,
      {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails },
      },
      { setupFutureUsage: saveCard ? 'OffSession' : undefined }
    );

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
    setComplete(true);
    setInputDisabled(false);
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
        ref={ref}
        disabled={inputDisabled}
        placeholders={{
          number: '4242 4242 4242 4242',
          postalCode: '12345',
          cvc: 'CVC',
          expiration: 'MM|YY',
        }}
        autofocus
        cardStyle={inputStyles}
        style={styles.cardField}
        onFormComplete={(cardDetails) => {
          console.log(cardDetails);
          setComplete(cardDetails.complete);
        }}
        defaultValues={{
          countryCode: 'US',
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
        accessibilityLabel="Pay"
        disabled={!isComplete}
        loading={loading}
      />
      <View style={[styles.row, styles.rowWithGap]}>
        <Button
          variant="default"
          onPress={() => {
            ref.current?.focus();
          }}
          title="Focus"
        />
        <Button
          variant="default"
          onPress={() => {
            ref.current?.blur();
          }}
          title="Blur"
        />
      </View>
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
  rowWithGap: {
    gap: 16,
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
  backgroundColor: '#D3D3D3',
  textColor: '#A020F0',
  borderColor: '#000000',
  borderWidth: 2,
  borderRadius: 10,
  cursorColor: '#000000',
  fontSize: 16,
  fontFamily: 'Macondo-Regular',
  placeholderColor: '#A020F0',
  textErrorColor: '#ff0000',
};
