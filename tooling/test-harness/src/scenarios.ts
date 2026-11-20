import {
  createPaymentMethod,
  createToken,
  handleURLCallback,
  initPaymentSheet,
  initStripe,
  isPlatformPaySupported,
} from '@stripe/stripe-react-native';

type Scenario = {
  name: string;
  run: () => Promise<unknown>;
};

// Every scenario must finish without network access or user input, so a run
// is repeatable on any simulator or emulator. Failures returned by the SDK are
// expected results: they exercise the native validation and error mappers.
export const scenarios: Scenario[] = [
  {
    name: 'initStripe',
    run: () =>
      initStripe({
        publishableKey: 'pk_test_test_harness',
        merchantIdentifier: 'merchant.com.stripe.react.native.testharness',
        urlScheme: 'stripe-test-harness',
      }),
  },
  {
    name: 'isPlatformPaySupported',
    run: () => isPlatformPaySupported(),
  },
  {
    name: 'handleURLCallback',
    run: () => handleURLCallback('stripe-test-harness://safepay/unknown'),
  },
  {
    name: 'createPaymentMethod (incomplete card)',
    run: () => createPaymentMethod({ paymentMethodType: 'Card' }),
  },
  {
    name: 'createToken (incomplete card)',
    run: () => createToken({ type: 'Card' }),
  },
  {
    name: 'initPaymentSheet (unknown intent)',
    run: () =>
      initPaymentSheet({
        merchantDisplayName: 'Test Harness',
        paymentIntentClientSecret: 'pi_test_harness_secret_test_harness',
      }),
  },
];
