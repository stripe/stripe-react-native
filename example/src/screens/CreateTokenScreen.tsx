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

  const _createToken = async (type: 'Card' | 'BankAccount' | 'PII') => {
    const { error, token } = await createToken({
      type: 'PII',
      pii: '000000000',
    });

    console.log({ token });
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
        onPress={() => _createToken('PII')}
        title="Create a token from PII"
        accessibilityLabel="Create a token from PII"
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
