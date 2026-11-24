import { NativeModules, Platform } from 'react-native';
import {
  createPaymentMethod,
  createPlatformPayPaymentMethod,
  createToken,
  handleURLCallback,
  initPaymentSheet,
  initStripe,
  isPlatformPaySupported,
} from '@stripe/stripe-react-native';
import { mountCheckoutElement } from './checkout-coverage';

type Scenario = {
  name: string;
  timeoutMs?: number;
  run: () => Promise<unknown>;
};

type CheckoutCoverageModule = {
  prepareCheckoutController: () => Promise<string>;
  invalidateCheckoutControllers: () => Promise<void>;
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
    name: 'createPlatformPayPaymentMethod',
    timeoutMs: 20000,
    run: () => {
      if (Platform.OS !== 'android') {
        return Promise.resolve({ error: { code: 'skipped' } });
      }
      return createPlatformPayPaymentMethod({
        googlePay: {
          testEnv: true,
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          merchantName: 'Test Harness',
          amount: 1250,
          label: 'Total',
        },
      });
    },
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
  {
    name: 'checkout detach',
    timeoutMs: 60000,
    run: async () => {
      if (Platform.OS !== 'ios') {
        return { error: { code: 'skipped' } };
      }
      const bridge = NativeModules.HarnessCheckoutCoverage as
        | CheckoutCoverageModule
        | undefined;
      if (!bridge) {
        throw new Error('HarnessCheckoutCoverage is unavailable');
      }
      const controllerId = await bridge.prepareCheckoutController();
      await mountCheckoutElement(controllerId);
      await bridge.invalidateCheckoutControllers();
      return undefined;
    },
  },
];
