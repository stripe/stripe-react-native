import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import {
  BillingDetails,
  CardDetails,
  CardField,
  useConfirmSetupIntent,
} from 'react-native-stripe-sdk';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { colors } from '../colors';
import Screen from '../components/Screen';

const defaultCard = {
  number: '4000000000003238',
  cvc: '424',
  expiryMonth: 1,
  expiryYear: 22,
};

export default function SetupFuturePaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);
  const [email, setEmail] = useState('');

  // It  is also possible to use `useStripe` and then `stripe.confirmSetupIntent`
  // The only difference is that this approach will not have `loading` status support and `onError`, `onSuccess` callbacks
  // But the Promise returned by the method will work the same allowing to catch errors and success states
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const createSetupIntentOnBackend = useCallback(
    async (customerEmail: string) => {
      const response = await fetch(`${API_URL}/create-setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: customerEmail }),
      });
      const { clientSecret } = await response.json();

      return clientSecret;
    },
    []
  );

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      // 1. Create setup intent on backend
      const clientSecret = await createSetupIntentOnBackend(email);

      // 2. Gather customer billing information (ex. email)
      const billingDetails: BillingDetails = {
        email: 'email@stripe.com',
        phone: '+48888000888',
        addressCity: 'Houston',
        addressCountry: 'US',
        addressLine1: '1459  Circle Drive',
        addressLine2: 'Texas',
        addressPostalCode: '77063',
      }; // mocked data for tests

      // 3. Confirm setup intent
      const intent = await confirmSetupIntent(
        clientSecret,
        card,
        billingDetails
      );
      Alert.alert(
        `Success: Setup intent created. Intent status: ${intent.status}`
      );
    } catch (e) {
      Alert.alert(`Error code: ${e.code}`, e.message);
      console.log('Setup intent creation error', e.message);
    }
  }, [card, confirmSetupIntent, createSetupIntentOnBackend, email]);

  return (
    <Screen>
      <TextInput
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <CardField
        defaultValue={defaultCard}
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          console.log('card details', cardDetails);
          setCard(cardDetails);
        }}
        style={styles.cardField}
      />
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handlePayPress}
          title="Save"
          loading={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  emailField: {
    borderWidth: 1,
    borderColor: 'lightgrey',
    borderRadius: 6,
    marginVertical: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  input: {
    height: 44,
    borderBottomColor: colors.slate,
    borderBottomWidth: 1.5,
  },
});
