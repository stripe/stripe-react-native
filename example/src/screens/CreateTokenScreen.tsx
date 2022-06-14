import type { Token } from '@stripe/stripe-react-native';
import {
  CardField,
  CardFieldInput,
  useStripe,
} from '@stripe/stripe-react-native';
import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function CreateTokenScreen() {
  const { createToken } = useStripe();

  const _createToken = async (type: Token.Type) => {
    const { error, token } = await createToken(buildTestTokenParams(type));

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log(`Error: ${JSON.stringify(error)}`);
    } else if (token) {
      Alert.alert(
        'Success',
        `The token was created successfully! token: ${token.id}`
      );
    }
  };

  return (
    <PaymentScreen>
      <Button
        variant="primary"
        onPress={() => _createToken('Pii')}
        title="Create a PII token"
        accessibilityLabel="Create a PII token"
      />
      <Text style={styles.or}>OR</Text>
      <Button
        variant="primary"
        onPress={() => _createToken('BankAccount')}
        title="Create a token from a bank account"
        accessibilityLabel="Create a token from a bank account"
      />
      <Text style={styles.or}>OR</Text>
      <CardField
        cardStyle={inputStyles}
        style={styles.cardField}
        postalCodeEnabled={false}
      />
      <Button
        variant="primary"
        onPress={() => _createToken('Card')}
        title="Create a token from a card"
        accessibilityLabel="Create a token from a card"
      />
    </PaymentScreen>
  );
}

function buildTestTokenParams(type: Token.Type): Token.CreateParams {
  switch (type) {
    case 'Pii':
      return {
        type: 'Pii',
        personalId: '000000000',
      };
    case 'Card':
      return {
        type: 'Card',
        name: 'David Wallace',
        currency: 'eur',
      };
    case 'BankAccount':
      return {
        type: 'BankAccount',
        accountNumber: '000123456789',
        routingNumber: '110000000', // Routing number is REQUIRED for US bank accounts
        country: 'US',
        currency: 'usd',
      };
    default:
      throw new Error(`Unsupported token type`);
  }
}

const styles = StyleSheet.create({
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  or: {
    textAlign: 'center',
    marginTop: 30,
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
