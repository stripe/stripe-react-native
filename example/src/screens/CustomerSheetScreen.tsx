import React from 'react';
import { Alert, Image, StyleSheet } from 'react-native';
import { CustomerSheetBeta } from '@stripe/stripe-react-native';
import type { PaymentSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';

const { CustomerSheet } = CustomerSheetBeta;

export default function CustomerSheetScreen() {
  const [stripeInitialized, setStripeInitialized] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [setupIntent, setSetupIntent] = React.useState('');
  const [ephemeralKeySecret, setEphemeralKeySecret] = React.useState('');
  const [customer, setCustomer] = React.useState('');
  const [customerSheetVisible, setCustomerSheetVisible] = React.useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    React.useState<PaymentSheet.PaymentOption | null>(null);

  React.useEffect(() => {
    fetchCustomerSheetParams();
  }, []);

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
      setReady(true);
    }
  };

  return (
    <PaymentScreen
      onInit={() => {
        setStripeInitialized(true);
      }}
    >
      <Button
        variant="primary"
        loading={!stripeInitialized}
        disabled={!ready}
        title={
          selectedPaymentOption
            ? selectedPaymentOption.label
            : 'Edit payment methods'
        }
        onPress={() => {
          setCustomerSheetVisible(true);
        }}
      />
      {selectedPaymentOption?.image && (
        <Image
          style={styles.image}
          source={{
            uri: `data:image/png;base64,${selectedPaymentOption?.image}`,
          }}
        />
      )}
      <CustomerSheet
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
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center', width: 150, height: 100 },
});
