import React from 'react';
import { Alert, Image, StyleSheet } from 'react-native';
import { CustomerSheet } from '@stripe/stripe-react-native';
import { PaymentSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import {
  ClientSecretProvider,
  CustomerSessionClientSecret,
  CustomerSheetInitParams,
} from '../../../src/types/CustomerSheet';

class MyClientSecretProvider implements ClientSecretProvider {
  customerId?: string | null = null;

  async provideSetupIntentClientSecret(): Promise<string> {
    const response = await fetch(
      `${API_URL}/customer-sheet-customer-session-create-setup-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId: this.customerId }),
      }
    );
    const result = await response.json();

    return result.setupIntent;
  }

  async provideCustomerSessionClientSecret(): Promise<CustomerSessionClientSecret> {
    console.log(
      'providesCustomerSessionClientSecret customerId',
      this.customerId
    );
    const response = await fetch(
      `${API_URL}/customer-sheet-customer-session-customer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId: this.customerId }),
      }
    );
    const result = await response.json();

    this.customerId = result.customer;

    return {
      customerId: result.customer,
      clientSecret: result.customerSessionClientSecret,
    };
  }
}

export default function CustomerSheetCustomerSessionScreen() {
  const [useComponent] = React.useState(false);
  const [stripeInitialized, setStripeInitialized] = React.useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    React.useState<PaymentSheet.PaymentOption | null>(null);
  const [customerSheetVisible, setCustomerSheetVisible] = React.useState(false);
  const [clientSecretProvider, setClientSecretProvider] =
    React.useState<ClientSecretProvider | null>(null);

  const setup = async () => {
    console.log('setup');
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

    const newClientSecretProvider = new MyClientSecretProvider();

    setClientSecretProvider(newClientSecretProvider);

    const params: CustomerSheetInitParams = {
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
      intentConfiguration: {
        paymentMethodTypes: ['card'],
      },
      clientSecretProvider: newClientSecretProvider,
    };

    const { error } = await CustomerSheet.initialize(params);
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
  };

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
      {useComponent && clientSecretProvider && (
        <CustomerSheet.Component
          visible={customerSheetVisible}
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
          intentConfiguration={{
            paymentMethodTypes: ['card'],
          }}
          clientSecretProvider={clientSecretProvider}
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
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center', width: 150, height: 100 },
});
