import React, { useCallback, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useStripe, PaymentSheet } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import type {
  PaymentMethod,
  ConfirmationToken,
} from '@stripe/stripe-react-native';
import { API_URL } from '../Config';
import OnBehalfOfPicker, {
  OnBehalfOfOption,
} from '../components/OnBehalfOfPicker';
import type { IntentConfiguration } from '@stripe/stripe-react-native';

export default function PaymentSheetWithConnectedAccountsScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [activeOnBehalfOf, setActiveOnBehalfOf] = useState<string | null>(null);
  const [onBehalfOfAccounts, setOnBehalfOfAccounts] = useState<
    OnBehalfOfOption[]
  >([]);
  const [useConfirmationToken, setUseConfirmationToken] = useState(false);

  const initialize = useCallback(async () => {
    const oboAccountsResponse = await fetch(`${API_URL}/on-behalf-of-accounts`);
    const oboAccountsResponseJson = await oboAccountsResponse.json();
    setOnBehalfOfAccounts(
      oboAccountsResponseJson.accounts.map((account: any) => ({
        value: account.id,
        label: account.displayName,
      }))
    );
  }, []);

  const setOnBehalfOfViaPicker = (option: string | null) => {
    console.log('setOnBehalfOfViaPicker', option);
    setActiveOnBehalfOf(option);
  };

  const openPaymentSheet = async () => {
    let mode: PaymentSheet.PaymentMode = {
      amount: 1000,
      currencyCode: 'EUR',
    };

    const getIntentConfiguration = () => {
      return useConfirmationToken
        ? {
            mode: mode,
            paymentMethodTypes: ['card'],
            onBehalfOf: activeOnBehalfOf,
            confirmationTokenConfirmHandler: async (
              confirmationToken: ConfirmationToken.Result,
              intentCreationCallback: (
                result: PaymentSheet.IntentCreationCallbackParams
              ) => void
            ) => {
              const response = await fetch(
                `${API_URL}/payment-sheet-customer-session-create-intent`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    confirmationToken: confirmationToken,
                    paymentMode: mode,
                    paymentMethodTypes: ['card'],
                    onBehalfOf: activeOnBehalfOf,
                  }),
                }
              );
              const responseJson = await response.json();
              intentCreationCallback({
                clientSecret: responseJson.clientSecret,
              });
            },
          }
        : {
            mode: mode,
            paymentMethodTypes: ['card'],
            onBehalfOf: activeOnBehalfOf,
            confirmHandler: async (
              paymentMethod: PaymentMethod.Result,
              _shouldSavePaymentMethod: boolean,
              intentCreationCallback: (
                result: PaymentSheet.IntentCreationCallbackParams
              ) => void
            ) => {
              const response = await fetch(
                `${API_URL}/payment-intent-for-payment-sheet`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paymentMethod: paymentMethod,
                    shouldSavePaymentMethod: _shouldSavePaymentMethod,
                    paymentMode: mode,
                    paymentMethodTypes: ['card'],
                    onBehalfOf: activeOnBehalfOf,
                  }),
                }
              );
              const responseJson = await response.json();
              intentCreationCallback({
                clientSecret: responseJson.clientSecret,
              });
            },
          };
    };

    let intentConfiguration: IntentConfiguration = getIntentConfiguration();

    console.log('intentConfiguration', intentConfiguration);
    console.log('activeOnBehalfOf', activeOnBehalfOf);

    await initPaymentSheet({
      intentConfiguration: intentConfiguration,
      merchantDisplayName: 'Example Inc.',
    });

    await presentPaymentSheet();
  };

  return (
    <PaymentScreen onInit={initialize}>
      <View style={{ height: 10 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Switch
          value={useConfirmationToken}
          onValueChange={setUseConfirmationToken}
        />
        <Text>
          {useConfirmationToken
            ? 'Use Confirmation Token'
            : 'Use Payment Method'}
        </Text>
      </View>

      <Text>hi there</Text>
      <Text>{activeOnBehalfOf ?? 'None'}</Text>
      <OnBehalfOfPicker
        options={onBehalfOfAccounts}
        selectedValue={null}
        onValueChange={setOnBehalfOfViaPicker}
      />
      <Button title="Open Payment Sheet" onPress={openPaymentSheet} />
    </PaymentScreen>
  );
}
