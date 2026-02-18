import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { CustomerSheet } from '@stripe/stripe-react-native';
import { PaymentSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import SelectedPaymentOption from '../components/SelectedPaymentOption';
import { API_URL } from '../Config';
import { ExampleCustomerAdapter } from './ExampleCustomerAdapter';

export default function CustomerSheetScreen() {
  const [useComponent, setUseComponent] = React.useState(false);
  const [opensCardScannerAutomatically, setOpensCardScannerAutomatically] =
    React.useState(false);
  const [stripeInitialized, setStripeInitialized] = React.useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    React.useState<PaymentSheet.PaymentOption | null>(null);
  const [setupIntent, setSetupIntent] = React.useState('');
  const [ephemeralKeySecret, setEphemeralKeySecret] = React.useState('');
  const [customer, setCustomer] = React.useState('');
  const [customerSheetVisible, setCustomerSheetVisible] = React.useState(false);
  const [customerAdapter, setCustomerAdapter] =
    React.useState<ExampleCustomerAdapter | null>(null);
  const isFirstRender = useRef(true);

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

  const setup = useCallback(async () => {
    const {
      customer: customerId,
      setupIntent: setupIntentClientSecret,
      ephemeralKeySecret: customerEphemeralKeySecret,
    } = await fetchCustomerSheetParams();
    const address = {
      city: 'San Francisco',
      country: 'US',
      line1: '510 Townsend St.',
      line2: '123 Street',
      postalCode: '94102',
      state: 'California',
    };
    const billingDetails = {
      name: 'Jane Doe',
      email: 'foo@bar.com',
      phone: '561-555-5555',
      address: address,
    };

    const { error } = await CustomerSheet.initialize({
      setupIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
      returnURL: 'com.stripe.react.native://stripe-redirect',
      removeSavedPaymentMethodMessage:
        'Are you sure you wanna remove this payment method? 😿',
      style: 'alwaysLight',
      merchantDisplayName: 'React Native Test Merchant',
      headerTextForSelectionScreen: 'Welcome to customer sheet!',
      defaultBillingDetails: billingDetails,
      billingDetailsCollectionConfiguration: {
        phone: PaymentSheet.CollectionMode.ALWAYS,
      },
      opensCardScannerAutomatically,
    });
    if (error) {
      Alert.alert(error.code, error.localizedMessage);
    }

    const {
      error: retrievalError,
      paymentOption,
      paymentMethod,
    } = await CustomerSheet.retrievePaymentOptionSelection();
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
  }, [opensCardScannerAutomatically]);

  // Re-initialize when opensCardScannerAutomatically changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setStripeInitialized(false);
    setup();
  }, [opensCardScannerAutomatically, setup]);

  const present = async () => {
    if (useComponent) {
      setCustomerSheetVisible(true);
    } else {
      const { error, paymentOption, paymentMethod } =
        await CustomerSheet.present();
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
      {useComponent && customerAdapter && (
        <CustomerSheet.Component
          visible={customerSheetVisible}
          setupIntentClientSecret={setupIntent}
          customerEphemeralKeySecret={ephemeralKeySecret}
          customerId={customer}
          returnURL={'com.stripe.react.native://stripe-redirect'}
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
          customerAdapter={customerAdapter}
        />
      )}
      <SelectedPaymentOption paymentOption={selectedPaymentOption} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Use component: </Text>
        <Switch
          testID="customer_adapter_switch"
          onValueChange={(v) => {
            if (!v) {
              setup();
            } else {
              setCustomerAdapter(new ExampleCustomerAdapter(customer));
            }
            setUseComponent(v);
          }}
          value={useComponent}
        />
      </View>
      <View style={styles.switchRowSecond}>
        <Text style={styles.switchLabel}>Opens card scanner: </Text>
        <Switch
          onValueChange={setOpensCardScannerAutomatically}
          value={opensCardScannerAutomatically}
        />
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
  switchRowSecond: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 20,
  },
});
