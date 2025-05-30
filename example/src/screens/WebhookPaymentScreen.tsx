import type {
  CardFieldInput,
  BillingDetails,
} from '@stripe/stripe-react-native';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import {
  CardBrand,
  CardField,
  useConfirmPayment,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import { colors } from '../colors';

export default function WebhookPaymentScreen() {
  const [email, setEmail] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [canPay, setCanPay] = useState(true);

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
    setCanPay(false);
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
        paymentMethodData: {
          billingDetails,
        },
      },
      {
        setupFutureUsage: saveCard ? 'OffSession' : undefined,
      }
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
    setCanPay(true);
  };

  const ref = useRef<CardFieldInput.Methods>(null);

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
        ref={ref}
        disabled={!canPay}
        postalCodeEnabled={false}
        autofocus
        placeholders={{
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
        onBlur={() => {
          console.log('blurField');
        }}
        cardStyle={inputStyles}
        style={styles.cardField}
        preferredNetworks={[CardBrand.Amex]}
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
        <Button
          variant="default"
          onPress={() => {
            ref.current?.clear();
          }}
          title="Clear"
        />
      </View>
      <View style={styles.row}>
        <Switch
          onValueChange={(value) => setSaveCard(value)}
          value={saveCard}
        />
        <Text style={styles.text}>Save card during payment</Text>
      </View>
      <Button
        variant="primary"
        disabled={!canPay}
        onPress={handlePayPress}
        title="Pay"
        accessibilityLabel="Pay"
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

const inputStyles: CardFieldInput.Styles = {
  borderWidth: 1,
  backgroundColor: '#FFFFFF',
  borderColor: '#000000',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'Macondo-Regular',
  placeholderColor: '#A020F0',
  textColor: '#0000ff',
};
