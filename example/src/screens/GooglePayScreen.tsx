import React, { useEffect, useState } from 'react';
import { GooglePay, useGooglePay } from '@stripe/stripe-react-native';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import Button from '../components/Button';
import { Alert } from 'react-native';

export default function GooglePayScreen() {
  const {
    initGooglePay,
    payWithGoogle,
    getTokenizationSpecification,
    loading,
  } = useGooglePay();
  const [initialized, setInitialized] = useState(false);

  const fetchPaymentIntentClientSecret = async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: [{ id: 'id' }],
        force3dSecure: true,
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  };

  const pay = async () => {
    const clientSecret = await fetchPaymentIntentClientSecret();

    const {
      tokenizationSpecification,
      error: tokenError,
    } = await getTokenizationSpecification();

    if (tokenError) {
      return;
    } else if (tokenizationSpecification) {
      const cardPaymentMethod: GooglePay.CardPaymentMethod = {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: [
            'AMEX',
            'DISCOVER',
            'INTERAC',
            'JCB',
            'MASTERCARD',
            'VISA',
          ],
          billingAddressRequired: true,
          billingAddressParameters: {
            format: 'MIN',
            phoneNumberRequired: false,
          },
        },
        tokenizationSpecification: JSON.parse(tokenizationSpecification),
      };

      const { paymentIntent, error: payError } = await payWithGoogle({
        clientSecret,
        requestParams: {
          apiVersion: 2,
          apiVersionMinor: 0,
          merchantInfo: {
            merchantName: 'Example Merchant',
          },
          allowedPaymentMethods: [cardPaymentMethod],
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: '0.12',
            currencyCode: 'USD',
          },
          emailRequired: true,
        },
      });

      if (payError) {
        Alert.alert(payError.code, payError.message);
      } else if (paymentIntent) {
        Alert.alert(
          'Success',
          `The payment was confirmed successfully. Intent status: ${paymentIntent.status}`
        );
      }
    }
  };

  useEffect(() => {
    async function initialize() {
      const { error } = await initGooglePay({
        testEnv: true,
        readyToPayParams: {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: [
                  'AMEX',
                  'DISCOVER',
                  'INTERAC',
                  'JCB',
                  'MASTERCARD',
                  'VISA',
                ],
              },
            },
            {
              type: 'PAYPAL',
              parameters: {
                purchase_context: {
                  purchase_units: {
                    payee: {
                      merchant_id: '{{PAYPAL_ACCOUNT_ID}}',
                    },
                  },
                },
              },
              tokenizationSpecification: {
                type: 'DIRECT',
              },
            },
          ],
        },
      });

      if (error) {
        Alert.alert(error.code, error.message);
        return;
      }
      setInitialized(true);
    }
    initialize();
  }, [initGooglePay]);

  return (
    <PaymentScreen>
      <Button
        disabled={!initialized}
        onPress={pay}
        loading={loading}
        variant="primary"
        title="Pay with Google Pay"
      />
    </PaymentScreen>
  );
}
