import {
  AuBECSDebitForm,
  AuBECSDebitFormComponent,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function AuBECSDebitSetupPaymentScreen() {
  const [formDetails, setFormDetails] =
    useState<AuBECSDebitFormComponent.FormDetails>();
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const createSetupIntentOnBackend = async (customerEmail: string) => {
    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        payment_method_types: ['au_becs_debit'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const handlePayPress = async () => {
    if (!formDetails) {
      return;
    }
    const clientSecret = await createSetupIntentOnBackend(formDetails.email);

    const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
      type: 'AuBecsDebit',
      formDetails,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup intent confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert(
        'Success',
        `Setup intent created. Intent status: ${setupIntent.status}`
      );
    }
  };

  return (
    <PaymentScreen paymentMethod="au_becs_debit">
      <AuBECSDebitForm
        style={styles.form}
        onComplete={(value) => setFormDetails(value)}
        companyName="test"
        // eslint-disable-next-line react-native/no-inline-styles
        formStyle={{ fontSize: 20 }}
      />

      <View style={styles.buttonContainer}>
        <Button
          disabled={!formDetails}
          title="Save"
          variant="primary"
          onPress={handlePayPress}
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
