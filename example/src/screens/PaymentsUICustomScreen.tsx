import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  useStripe,
  Address,
  BillingDetails,
} from '@stripe/stripe-react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import CustomerSessionSwitch from '../components/CustomerSessionSwitch';
import { getClientSecretParams } from '../helpers';

export default function PaymentsUICustomScreen() {
  const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } =
    useStripe();
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    image: string;
    label: string;
  } | null>(null);

  const [customerKeyType, setCustomerKeyType] = useState<string>(
    'legacy_ephemeral_key'
  );

  const fetchPaymentSheetParams = async (customer_key_type: string) => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_key_type,
      }),
    });

    if (customer_key_type === 'customer_session') {
      const { paymentIntent, customerSessionClientSecret, customer } =
        await response.json();
      return {
        paymentIntent,
        customerSessionClientSecret,
        customer,
      };
    } else {
      const { paymentIntent, ephemeralKey, customer } = await response.json();
      return {
        paymentIntent,
        ephemeralKey,
        customer,
      };
    }
  };

  const initialisePaymentSheet = useCallback(async () => {
    setLoading(true);

    try {
      const { paymentIntent, ...remainingParams } =
        await fetchPaymentSheetParams(customerKeyType);

      const clientSecretParams = getClientSecretParams(
        customerKeyType,
        remainingParams
      );

      const address: Address = {
        city: 'San Francisco',
        country: 'AT',
        line1: '510 Townsend St.',
        line2: '123 Street',
        postalCode: '94102',
        state: 'California',
      };
      const billingDetails: BillingDetails = {
        name: 'Jane Doe',
        email: 'foo@bar.com',
        phone: '555-555-555',
        address: address,
      };

      const { error, paymentOption } = await initPaymentSheet({
        paymentIntentClientSecret: paymentIntent,
        customFlow: true,
        merchantDisplayName: 'Example Inc.',
        style: 'automatic',
        googlePay: { merchantCountryCode: 'US', testEnv: true },
        returnURL: 'stripe-example://stripe-redirect',
        defaultBillingDetails: billingDetails,
        ...clientSecretParams,
      });

      if (!error) {
        setPaymentSheetEnabled(true);
      } else {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
      if (paymentOption) {
        setPaymentMethod(paymentOption);
      }
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  }, [customerKeyType, initPaymentSheet]);

  const toggleCustomerKeyType = (value: boolean) => {
    if (value) {
      setCustomerKeyType('customer_session');
    } else {
      setCustomerKeyType('legacy_ephemeral_key');
    }
  };

  useEffect(() => {
    setPaymentSheetEnabled(false);
    initialisePaymentSheet().catch((err) => console.log(err));
  }, [customerKeyType, initialisePaymentSheet]);

  const choosePaymentOption = async () => {
    const { error, paymentOption } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentOption) {
      setPaymentMethod({
        label: paymentOption.label,
        image: paymentOption.image,
      });
    } else {
      setPaymentMethod(null);
    }
  };

  const onPressBuy = async () => {
    setLoading(true);
    const { error } = await confirmPaymentSheetPayment();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert('Success', 'The payment was confirmed successfully!');
      setPaymentSheetEnabled(false);
    }
    setLoading(false);
  };

  return (
    // In your app’s checkout, make a network request to the backend and initialize PaymentSheet.
    // To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
    <PaymentScreen onInit={initialisePaymentSheet}>
      <View>
        <CustomerSessionSwitch
          value={customerKeyType === 'customer_session'}
          onValueChange={toggleCustomerKeyType}
        />
        <Button
          variant="primary"
          loading={loading}
          title={'Choose payment method'}
          disabled={!paymentSheetEnabled}
          onPress={choosePaymentOption}
        />
        <Button
          variant="primary"
          loading={loading}
          title={'Trigger timeout'}
          disabled={!paymentSheetEnabled}
          onPress={async () => {
            setLoading(true);
            const { error } = await presentPaymentSheet({ timeout: 5000 });
            if (error) {
              Alert.alert(`${error.code}`, error.message);
            }
            setLoading(false);
          }}
        />
      </View>

      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentMethod || !paymentSheetEnabled}
          title={`Buy${paymentMethod ? ` with ${paymentMethod.label}` : ''}`}
          onPress={onPressBuy}
        />
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: 40,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  paymentMethodTitle: {
    color: colors.slate,
    fontWeight: 'bold',
  },
  image: {
    width: 26,
    height: 20,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});
