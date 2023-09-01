import React from 'react';
import { Alert, Image, StyleSheet, Switch, Text, View } from 'react-native';
import { CustomerSheetBeta } from '@stripe/stripe-react-native';
import type { PaymentSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

export default function CustomerSheetScreen() {
  const [useComponent, setUseComponent] = React.useState(false);
  const [stripeInitialized, setStripeInitialized] = React.useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    React.useState<PaymentSheet.PaymentOption | null>(null);
  const [setupIntent, setSetupIntent] = React.useState('');
  const [ephemeralKeySecret, setEphemeralKeySecret] = React.useState('');
  const [customer, setCustomer] = React.useState('');
  const [customerSheetVisible, setCustomerSheetVisible] = React.useState(false);

  const fetchCustomerSheetParams = async () => {
    const response = await fetch(`${API_URL}/customer-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();

    if (!result.setupIntent || !result.ephemeralKeySecret || !result.customer) {
      console.log('There was an error on the server.');
    } else {
      setSetupIntent(result.setupIntent);
      setEphemeralKeySecret(result.ephemeralKeySecret);
      setCustomer(result.customer);
    }

    return {
      setupIntent: result.setupIntent,
      ephemeralKeySecret: result.ephemeralKeySecret,
      customer: result.customer,
    };
  };

  const setup = async () => {
    const {
      customer: customerId,
      setupIntent: setupIntentClientSecret,
      ephemeralKeySecret: customerEphemeralKeySecret,
    } = await fetchCustomerSheetParams();
    const { error } = await CustomerSheetBeta.initialize({
      setupIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
      returnURL: 'stripe-example://stripe-redirect',
    });
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    }

    const {
      error: retrievalError,
      paymentOption,
      paymentMethod,
    } = await CustomerSheetBeta.retrievePaymentOptionSelection();
    if (retrievalError) {
      Alert.alert(retrievalError.code, retrievalError.localizedMessage);
    }
    if (paymentOption) {
      setSelectedPaymentOption(paymentOption);
      console.log(JSON.stringify(paymentOption, null, 2));
    }
    if (paymentMethod) {
      console.log(JSON.stringify(paymentMethod, null, 2));
    }

    setStripeInitialized(true);
  };

  const present = async () => {
    if (useComponent) {
      setCustomerSheetVisible(true);
    } else {
      const { error, paymentOption, paymentMethod } =
        await CustomerSheetBeta.present();
      if (error) {
        Alert.alert(error.code, error.localizedMessage);
      }
      if (paymentOption) {
        setSelectedPaymentOption(paymentOption);
        console.log(JSON.stringify(paymentOption, null, 2));
      }
      if (paymentMethod) {
        console.log(JSON.stringify(paymentMethod, null, 2));
      }
    }
  };

  return (
    <PaymentScreen onInit={setup}>
      <Button
        variant="primary"
        loading={!stripeInitialized}
        title={
          selectedPaymentOption
            ? selectedPaymentOption.label
            : 'Edit payment methods'
        }
        onPress={() => {
          present();
        }}
      />
      {useComponent && (
        <CustomerSheetBeta.CustomerSheet
          visible={customerSheetVisible}
          setupIntentClientSecret={setupIntent}
          customerEphemeralKeySecret={ephemeralKeySecret}
          customerId={customer}
          returnURL={'stripe-example://stripe-redirect'}
          onResult={({ error, paymentOption, paymentMethod }) => {
            setCustomerSheetVisible(false);
            if (error) {
              Alert.alert(error.code, error.localizedMessage);
            }
            if (paymentOption) {
              setSelectedPaymentOption(paymentOption);
              console.log(JSON.stringify(paymentOption, null, 2));
            }
            if (paymentMethod) {
              console.log(JSON.stringify(paymentMethod, null, 2));
            }
          }}
        />
      )}
      {selectedPaymentOption?.image && (
        <Image
          style={styles.image}
          source={{
            uri: `data:image/png;base64,${selectedPaymentOption?.image}`,
          }}
        />
      )}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Use component: </Text>
        <Switch onValueChange={setUseComponent} value={useComponent} />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    marginTop: 350,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 20,
  },
  image: { alignSelf: 'center', width: 150, height: 100 },
});
