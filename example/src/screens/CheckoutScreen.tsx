import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { initStripe } from '@stripe/stripe-react-native';
import { fetchCheckoutSessionParams } from '../api/checkoutSession';
import { CheckoutPlaygroundCartView } from '../checkoutPlayground/CheckoutPlaygroundCartView';
import { CheckoutPlaygroundConfigView } from '../checkoutPlayground/CheckoutPlaygroundConfigView';
import {
  defaultCheckoutPlaygroundConfig,
  type CheckoutPlaygroundConfig,
} from '../checkoutPlayground/types';

type Phase = 'config' | 'cart';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
};

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const [phase, setPhase] = useState<Phase>('config');
  const [config, setConfig] = useState<CheckoutPlaygroundConfig>(
    defaultCheckoutPlaygroundConfig
  );
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleCreateSession = useCallback(async () => {
    setIsCreating(true);
    setErrorMessage(undefined);

    try {
      const { publishableKey, checkoutSessionClientSecret } =
        await fetchCheckoutSessionParams(config);

      await initStripe({
        publishableKey,
        merchantIdentifier: 'merchant.com.stripe.react.native',
        urlScheme: 'com.stripe.react.native',
        setReturnUrlSchemeOnAndroid: true,
      });

      setClientSecret(checkoutSessionClientSecret);
      setPhase('cart');
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to bootstrap the checkout playground.')
      );
    } finally {
      setIsCreating(false);
    }
  }, [config]);

  if (phase === 'cart' && clientSecret) {
    return (
      <CheckoutPlaygroundCartView
        clientSecret={clientSecret}
        config={config}
        onSuccessfulPayment={() => {
          navigation.goBack();
        }}
      />
    );
  }

  return (
    <CheckoutPlaygroundConfigView
      config={config}
      errorMessage={errorMessage}
      isCreating={isCreating}
      onChange={setConfig}
      onCreate={() => {
        handleCreateSession();
      }}
    />
  );
}
