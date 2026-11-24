/**
 * Bridge contract fixtures, JS side: each fixture's input is passed through
 * the public API, and the test asserts the exact arguments that reach the
 * TurboModule. The native halves live in ios/Tests/BridgeContractTests.swift
 * and android/.../bridgecontracts/BridgeContractTest.kt; the fixture types
 * are checked by packages/bridge-contracts/scripts/check.mjs.
 */
import fs from 'fs';
import path from 'path';
import { Platform } from 'react-native';
import React from 'react';
import {
  act,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { CardField } from '../../components/CardField';
import NativeCardField from '../../specs/NativeCardField';
import { CardForm } from '../../components/CardForm';
import NativeCardForm from '../../specs/NativeCardForm';
import { AuBECSDebitForm } from '../../components/AuBECSDebitForm';
import NativeAuBECSDebitForm from '../../specs/NativeAuBECSDebitForm';
import { PaymentMethodMessagingElement } from '../../components/PaymentMethodMessagingElement';
import NativePaymentMethodMessagingElement from '../../specs/NativePaymentMethodMessagingElement';
import { AddressSheet } from '../../components/AddressSheet';
import NativeAddressSheet from '../../specs/NativeAddressSheet';
import { PlatformPayButton } from '../../components/PlatformPayButton';
import NativeApplePayButton from '../../specs/NativeApplePayButton';
import { AddToWalletButton } from '../../components/AddToWalletButton';
import NativeAddToWalletButton from '../../specs/NativeAddToWalletButton';
import NativeEmbeddedPaymentElement from '../../specs/NativeEmbeddedPaymentElement';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import NativeOnrampSdk from '../../specs/NativeOnrampSdkModule';
import * as stripe from '../../functions';
import { initStripe } from '../../components/StripeProvider';
import { CustomerSheet } from '../../components/CustomerSheet';
import { createCheckoutElements } from '../../checkout/createCheckoutElements';
import { useOnramp } from '../../hooks/useOnramp';
import { useEmbeddedPaymentElement } from '../EmbeddedPaymentElement';
import { CaptureMethod } from '../PaymentSheet';
import pjson from '../../../package.json';

const FUNCTION = '$function';

const mockListeners: Record<string, (payload: any) => void> = {};

jest.mock('../../events', () => ({
  addListener: (event: string, handler: (payload: any) => void) => {
    mockListeners[event] = handler;
    return { remove: jest.fn() };
  },
}));

function mockTurboModule() {
  const methods: Record<string | symbol, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(
      {},
      {
        get: (_, name) => {
          methods[name] ??= jest.fn(async () => ({}));
          return methods[name];
        },
      }
    ),
  };
}

jest.mock('../../specs/NativeStripeSdkModule', () => mockTurboModule());
jest.mock('../../specs/NativeOnrampSdkModule', () => mockTurboModule());

type Fixture = {
  method: string;
  platforms?: Array<'ios' | 'android'>;
  input: Record<string, any>;
};

const fixturesDir = path.join(
  __dirname,
  '../../../packages/bridge-contracts/fixtures'
);
const fixtures = fs
  .readdirSync(fixturesDir)
  .flatMap((family) =>
    fs
      .readdirSync(path.join(fixturesDir, family))
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(family, file))
  )
  .sort()
  .map((name) => ({
    name,
    fixture: JSON.parse(
      fs.readFileSync(path.join(fixturesDir, name), 'utf8')
    ) as Fixture,
  }));

/** Fixture input as an app would pass it: "$function" becomes a function. */
function toJs(value: any): any {
  if (value === FUNCTION) return jest.fn();
  if (Array.isArray(value)) return value.map(toJs);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJs(item)])
    );
  }
  return value;
}

/** What reached native, written the way fixtures write it. */
function fromNative(value: any): any {
  if (typeof value === 'function') return FUNCTION;
  if (Array.isArray(value)) return value.map(fromNative);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fromNative(item)])
    );
  }
  return value;
}

const native = NativeStripeSdk as unknown as Record<string, jest.Mock>;
const onramp = NativeOnrampSdk as unknown as Record<string, jest.Mock>;

type Call = { mock: jest.Mock; args: any[] };

/**
 * Calls the public API for a fixture and returns the TurboModule mock that
 * should have received the fixture input, with the expected arguments.
 */
const adapters: Record<string, (input: Record<string, any>) => Promise<Call>> =
  {
    // initStripe adds appInfo itself; the last test checks its contents.
    'StripeSdk.initialise': async ({ params }) => {
      await initStripe(toJs(withoutAppInfo(params)));
      const { appInfo } = native.initialise.mock.calls[0][0];
      return { mock: native.initialise, args: [{ ...params, appInfo }] };
    },
    'OnrampSdk.initialise': async ({ params }) => {
      await withPlatform('android', () =>
        initStripe(toJs(withoutAppInfo(params)))
      );
      const { appInfo } = onramp.initialise.mock.calls[0][0];
      return { mock: onramp.initialise, args: [{ ...params, appInfo }] };
    },
    'StripeSdk.createPaymentMethod': async ({ params, options }) => {
      await stripe.createPaymentMethod(toJs(params), toJs(options));
      return { mock: native.createPaymentMethod, args: [params, options] };
    },
    'StripeSdk.confirmPayment': async (input) => {
      const { paymentIntentClientSecret, params, options } = input;
      await stripe.confirmPayment(
        paymentIntentClientSecret,
        toJs(params ?? undefined),
        toJs(options)
      );
      return {
        mock: native.confirmPayment,
        args: [paymentIntentClientSecret, params, options],
      };
    },
    'StripeSdk.confirmSetupIntent': async (input) => {
      const { paymentIntentClientSecret, params, options } = input;
      await stripe.confirmSetupIntent(
        paymentIntentClientSecret,
        toJs(params),
        toJs(options)
      );
      return {
        mock: native.confirmSetupIntent,
        args: [paymentIntentClientSecret, params, options],
      };
    },
    'StripeSdk.createToken': async ({ params }) => {
      await stripe.createToken(toJs(params));
      return { mock: native.createToken, args: [params] };
    },
    'StripeSdk.verifyMicrodeposits': async (input) => {
      const { isPaymentIntent, clientSecret, params } = input;
      await (isPaymentIntent
        ? stripe.verifyMicrodepositsForPayment(clientSecret, toJs(params))
        : stripe.verifyMicrodepositsForSetup(clientSecret, toJs(params)));
      return {
        mock: native.verifyMicrodeposits,
        args: [isPaymentIntent, clientSecret, params],
      };
    },
    'StripeSdk.collectBankAccount': async (input) => {
      const { isPaymentIntent, clientSecret, params } = input;
      await (isPaymentIntent
        ? stripe.collectBankAccountForPayment(clientSecret, toJs(params))
        : stripe.collectBankAccountForSetup(clientSecret, toJs(params)));
      return {
        mock: native.collectBankAccount,
        args: [isPaymentIntent, clientSecret, params],
      };
    },
    'StripeSdk.initPaymentSheet': async ({ params }) => {
      await stripe.initPaymentSheet(toJs(params));
      return { mock: native.initPaymentSheet, args: [params] };
    },
    'StripeSdk.presentPaymentSheet': async ({ options }) => {
      await stripe.presentPaymentSheet(toJs(options));
      return { mock: native.presentPaymentSheet, args: [options] };
    },
    'StripeSdk.intentCreationCallback': async ({ result }) => {
      await stripe.initPaymentSheet({
        merchantDisplayName: 'Bridge Contracts',
        intentConfiguration: {
          mode: {
            type: 'payment',
            amount: 100,
            currencyCode: 'usd',
            captureMethod: CaptureMethod.Automatic,
          },
          confirmHandler: (_paymentMethod, _save, intentCreationCallback) =>
            intentCreationCallback(toJs(result)),
        },
      });
      mockListeners.onConfirmHandlerCallback({
        paymentMethod: {},
        shouldSavePaymentMethod: false,
      });
      return { mock: native.intentCreationCallback, args: [result] };
    },
    'StripeSdk.confirmationTokenCreationCallback': async ({ result }) => {
      await stripe.initPaymentSheet({
        merchantDisplayName: 'Bridge Contracts',
        intentConfiguration: {
          mode: {
            type: 'payment',
            amount: 100,
            currencyCode: 'usd',
            captureMethod: CaptureMethod.Automatic,
          },
          confirmationTokenConfirmHandler: (_token, intentCreationCallback) =>
            intentCreationCallback(toJs(result)),
        },
      });
      mockListeners.onConfirmationTokenHandlerCallback({
        confirmationToken: {},
      });
      return { mock: native.confirmationTokenCreationCallback, args: [result] };
    },
    'StripeSdk.customPaymentMethodResultCallback': async ({ result }) => {
      await stripe.initPaymentSheet({
        merchantDisplayName: 'Bridge Contracts',
        paymentIntentClientSecret: 'pi_bridge_secret_contracts',
        customPaymentMethodConfiguration: {
          customPaymentMethods: [{ id: 'cpmt_bridge' }],
          confirmCustomPaymentMethodCallback: (
            _customPaymentMethod,
            _billingDetails,
            resultHandler
          ) => resultHandler(toJs(result)),
        },
      });
      mockListeners.onCustomPaymentMethodConfirmHandlerCallback({
        customPaymentMethod: {},
        billingDetails: null,
      });
      return { mock: native.customPaymentMethodResultCallback, args: [result] };
    },
    'StripeSdk.createEmbeddedPaymentElement': async (input) => {
      const { intentConfig, configuration } = input;
      const jsIntent = toJs(intentConfig);
      const jsConfiguration = toJs(configuration);
      renderHook(() => useEmbeddedPaymentElement(jsIntent, jsConfiguration));
      await waitFor(() =>
        expect(native.createEmbeddedPaymentElement).toHaveBeenCalled()
      );
      return {
        mock: native.createEmbeddedPaymentElement,
        args: [intentConfig, configuration],
      };
    },
    'StripeSdk.updateEmbeddedPaymentElement': async ({ intentConfig }) => {
      const jsIntent = toJs(intentConfig);
      const configuration = { merchantDisplayName: 'Bridge Contracts' };
      const { result } = renderHook(() =>
        useEmbeddedPaymentElement(jsIntent, configuration)
      );
      await waitFor(() =>
        expect(native.createEmbeddedPaymentElement).toHaveBeenCalled()
      );
      await act(async () => {
        await result.current.update(jsIntent);
      });
      return {
        mock: native.updateEmbeddedPaymentElement,
        args: [intentConfig],
      };
    },
    ...customerSheetAndPlatformPayAdapters(),
    ...checkoutAndVerticalAdapters(),
    ...componentAdapters(),
  };

/**
 * Renders the public component with the fixture props and records the props
 * its native component receives, keyed like the fixture input.
 */
function renderedProps(
  element: React.ReactElement,
  nativeComponent: React.ComponentType<any>,
  keys: string[]
): Call {
  const { UNSAFE_getByType } = render(element);
  const props = UNSAFE_getByType(nativeComponent).props;
  const mock = jest.fn();
  mock(Object.fromEntries(keys.map((key) => [key, props[key]])));
  return { mock, args: [] };
}

function componentAdapters(): typeof adapters {
  const component =
    (
      Component: React.ComponentType<any>,
      nativeComponent: React.ComponentType<any>,
      publicProps: (input: Record<string, any>) => Record<string, any> = toJs
    ) =>
    async (input: Record<string, any>) => {
      const call = renderedProps(
        <Component {...publicProps(input)} />,
        nativeComponent,
        Object.keys(input)
      );
      return { ...call, args: [input] };
    };
  return {
    'component:CardField': component(CardField, NativeCardField),
    'component:CardForm': component(CardForm, NativeCardForm),
    'component:PaymentMethodMessagingElementView': component(
      PaymentMethodMessagingElement,
      NativePaymentMethodMessagingElement
    ),
    'component:AddressSheetView': component(
      AddressSheet,
      NativeAddressSheet,
      ({ appearance, defaultValues, additionalFields }) => ({
        visible: false,
        appearance: toJs(appearance),
        defaultValues: toJs(defaultValues),
        additionalFields: toJs(additionalFields),
        onSubmit: jest.fn(),
        onError: jest.fn(),
      })
    ),
    'component:ApplePayButton': component(
      PlatformPayButton,
      NativeApplePayButton,
      () => ({
        onPress: jest.fn(),
        onShippingMethodSelected: jest.fn(),
        onShippingContactSelected: jest.fn(),
      })
    ),
    'component:AddToWalletButton': component(
      AddToWalletButton,
      NativeAddToWalletButton,
      ({ cardDetails, token, ephemeralKey }) => ({
        cardDetails: toJs(cardDetails),
        token: toJs(token),
        ephemeralKey: toJs(ephemeralKey),
        androidAssetSource: { uri: 'bridge-contracts.png' },
        onComplete: jest.fn(),
      })
    ),
    'component:EmbeddedPaymentElementView': async (input) => {
      const intentConfig = toJs(input.intentConfiguration);
      const configuration = toJs(input.configuration);
      // On Android the hook renders the native view directly from its props.
      const Host = () =>
        useEmbeddedPaymentElement(intentConfig, configuration)
          .embeddedPaymentElementView;
      const call = await withPlatform('android', async () =>
        renderedProps(
          <Host />,
          NativeEmbeddedPaymentElement,
          Object.keys(input)
        )
      );
      return { ...call, args: [input] };
    },
    'component:AuBECSDebitForm': component(
      AuBECSDebitForm,
      NativeAuBECSDebitForm,
      (input) => ({
        companyName: 'Bridge Contracts, Inc.',
        onComplete: jest.fn(),
        ...toJs(input),
      })
    ),
  };
}

/** A controller with a mocked native session; JS generates its controller ID. */
async function checkoutController() {
  const controller = await createCheckoutElements({
    clientSecret: 'cs_test_bridge_secret_contracts',
    returnURL: 'bridgecontracts://stripe-redirect',
  });
  return { controller, controllerId: native.createCheckout.mock.calls[0][1] };
}

function checkoutAndVerticalAdapters(): typeof adapters {
  const onrampCall =
    (
      run: (hook: ReturnType<typeof useOnramp>, input: any) => Promise<unknown>,
      nativeMethod: string,
      params: string[]
    ) =>
    async (input: Record<string, any>) => {
      const { result } = renderHook(() => useOnramp());
      await run(result.current, input);
      return { mock: onramp[nativeMethod], args: params.map((p) => input[p]) };
    };
  return {
    'StripeSdk.createCheckout': async ({ params }) => {
      await createCheckoutElements(toJs(params)).catch(() => undefined);
      const controllerId = native.createCheckout.mock.calls[0][1];
      return { mock: native.createCheckout, args: [params, controllerId] };
    },
    'StripeSdk.updateCheckoutShippingAddress': async ({ params }) => {
      const { controller, controllerId } = await checkoutController();
      await controller.updateShippingAddress(toJs(params));
      return {
        mock: native.updateCheckoutShippingAddress,
        args: [controllerId, params],
      };
    },
    'StripeSdk.confirmCheckout': async () => {
      const { controller, controllerId } = await checkoutController();
      await controller.confirm();
      return { mock: native.confirmCheckout, args: [controllerId] };
    },
    'StripeSdk.collectBankAccountToken': async ({ clientSecret, params }) => {
      await stripe.collectBankAccountToken(clientSecret, toJs(params));
      return {
        mock: native.collectBankAccountToken,
        args: [clientSecret, params],
      };
    },
    'StripeSdk.collectFinancialConnectionsAccounts': async ({
      clientSecret,
      params,
    }) => {
      await stripe.collectFinancialConnectionsAccounts(
        clientSecret,
        toJs(params)
      );
      return {
        mock: native.collectFinancialConnectionsAccounts,
        args: [clientSecret, params],
      };
    },
    'StripeSdk.canAddCardToWallet': async ({ params }) => {
      await stripe.canAddCardToWallet(toJs(params));
      return { mock: native.canAddCardToWallet, args: [params] };
    },
    'StripeSdk.isCardInWallet': async ({ params }) => {
      await stripe.isCardInWallet(toJs(params));
      return { mock: native.isCardInWallet, args: [params] };
    },
    'OnrampSdk.configureOnramp': onrampCall(
      (hook, { config }) => hook.configure(toJs(config)),
      'configureOnramp',
      ['config']
    ),
    'OnrampSdk.registerLinkUser': onrampCall(
      (hook, { info }) => hook.registerLinkUser(toJs(info)),
      'registerLinkUser',
      ['info']
    ),
    'OnrampSdk.attachKycInfo': onrampCall(
      (hook, { kycInfo }) => hook.attachKycInfo(toJs(kycInfo)),
      'attachKycInfo',
      ['kycInfo']
    ),
    'OnrampSdk.submitIdentifiers': onrampCall(
      (hook, { identifiers }) => hook.submitIdentifiers(toJs(identifiers)),
      'submitIdentifiers',
      ['identifiers']
    ),
    'OnrampSdk.presentKycInfoVerification': onrampCall(
      (hook, { updatedAddress }) =>
        hook.presentKycInfoVerification(toJs(updatedAddress)),
      'presentKycInfoVerification',
      ['updatedAddress']
    ),
    'OnrampSdk.collectPaymentMethod': onrampCall(
      (hook, { paymentMethod, platformPayParams }) =>
        hook.collectPaymentMethod(paymentMethod, toJs(platformPayParams)),
      'collectPaymentMethod',
      ['paymentMethod', 'platformPayParams']
    ),
    'OnrampSdk.getCryptoTokenDisplayData': onrampCall(
      (hook, { token }) => hook.getCryptoTokenDisplayData(toJs(token)),
      'getCryptoTokenDisplayData',
      ['token']
    ),
    'StripeSdk.initLinkController': async ({ params }) => {
      await stripe.initLinkController(toJs(params));
      return { mock: native.initLinkController, args: [params] };
    },
    'StripeSdk.presentLinkController': async () => {
      await stripe.presentLinkController();
      return { mock: native.presentLinkController, args: [] };
    },
    'StripeSdk.confirmLinkControllerSetupIntent': async ({ params }) => {
      await stripe.confirmLinkControllerSetupIntent(params.clientSecret);
      return { mock: native.confirmLinkControllerSetupIntent, args: [params] };
    },
  };
}

/** Lets awaited listener handlers run after a mocked native event. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

function customerSheetAndPlatformPayAdapters(): typeof adapters {
  const adapterCallback =
    (
      adapterMethod: 'attachPaymentMethod' | 'detachPaymentMethod',
      event: string,
      nativeMethod: string
    ) =>
    async ({ paymentMethod }: Record<string, any>) => {
      await CustomerSheet.initialize({
        customerId: 'cus_bridge_contracts',
        customerEphemeralKeySecret: 'ek_test_bridge_contracts',
        customerAdapter: { [adapterMethod]: async () => toJs(paymentMethod) },
      });
      mockListeners[event]({ paymentMethodId: 'pm_bridge_contracts' });
      await flush();
      return { mock: native[nativeMethod], args: [paymentMethod] };
    };
  return {
    'StripeSdk.initCustomerSheet': async ({ params }) => {
      await CustomerSheet.initialize(toJs(params));
      const overrides = native.initCustomerSheet.mock.calls[0][1];
      return { mock: native.initCustomerSheet, args: [params, overrides] };
    },
    'StripeSdk.presentCustomerSheet': async ({ params }) => {
      await CustomerSheet.present(toJs(params));
      return { mock: native.presentCustomerSheet, args: [params] };
    },
    'StripeSdk.customerAdapterFetchPaymentMethodsCallback': async ({
      paymentMethods,
    }) => {
      await CustomerSheet.initialize({
        customerId: 'cus_bridge_contracts',
        customerEphemeralKeySecret: 'ek_test_bridge_contracts',
        customerAdapter: {
          fetchPaymentMethods: async () => toJs(paymentMethods),
        },
      });
      mockListeners.onCustomerAdapterFetchPaymentMethodsCallback({});
      await flush();
      return {
        mock: native.customerAdapterFetchPaymentMethodsCallback,
        args: [paymentMethods],
      };
    },
    'StripeSdk.customerAdapterAttachPaymentMethodCallback': adapterCallback(
      'attachPaymentMethod',
      'onCustomerAdapterAttachPaymentMethodCallback',
      'customerAdapterAttachPaymentMethodCallback'
    ),
    'StripeSdk.customerAdapterDetachPaymentMethodCallback': adapterCallback(
      'detachPaymentMethod',
      'onCustomerAdapterDetachPaymentMethodCallback',
      'customerAdapterDetachPaymentMethodCallback'
    ),
    'StripeSdk.clientSecretProviderCustomerSessionClientSecretCallback':
      async ({ customerSessionClientSecret }) => {
        const { requestId, customerId, clientSecret, error } =
          customerSessionClientSecret;
        await CustomerSheet.initialize({
          intentConfiguration: {},
          clientSecretProvider: {
            provideSetupIntentClientSecret: async () => '',
            provideCustomerSessionClientSecret: async () => {
              if (error) throw new Error(error);
              return { customerId, clientSecret };
            },
          },
        });
        mockListeners.onCustomerSessionProviderCustomerSessionClientSecret({
          requestId,
        });
        await flush();
        return {
          mock: native.clientSecretProviderCustomerSessionClientSecretCallback,
          args: [customerSessionClientSecret],
        };
      },
    'StripeSdk.isPlatformPaySupported': async ({ params }) => {
      await stripe.isPlatformPaySupported(toJs(params));
      return { mock: native.isPlatformPaySupported, args: [params] };
    },
    'StripeSdk.createPlatformPayPaymentMethod': async (input) => {
      const { params, usesDeprecatedTokenFlow } = input;
      await (usesDeprecatedTokenFlow
        ? stripe.createPlatformPayToken(toJs(params))
        : stripe.createPlatformPayPaymentMethod(toJs(params)));
      return {
        mock: native.createPlatformPayPaymentMethod,
        args: [params, usesDeprecatedTokenFlow],
      };
    },
    'StripeSdk.confirmPlatformPay': async (input) => {
      const { clientSecret, params, isPaymentIntent } = input;
      await (isPaymentIntent
        ? stripe.confirmPlatformPayPayment(clientSecret, toJs(params))
        : stripe.confirmPlatformPaySetupIntent(clientSecret, toJs(params)));
      return {
        mock: native.confirmPlatformPay,
        args: [clientSecret, params, isPaymentIntent],
      };
    },
    'StripeSdk.updatePlatformPaySheet': async (input) => {
      const { summaryItems, shippingMethods, errors } = input;
      await stripe.updatePlatformPaySheet({
        applePay: { cartItems: summaryItems, shippingMethods, errors },
      });
      return {
        mock: native.updatePlatformPaySheet,
        args: [summaryItems, shippingMethods, errors],
      };
    },
  };
}

function withoutAppInfo(params: Record<string, any>) {
  const initParams = { ...params };
  delete initParams.appInfo;
  return initParams;
}

async function withPlatform<T>(
  os: typeof Platform.OS,
  run: () => Promise<T>
): Promise<T> {
  const original = Platform.OS;
  Platform.OS = os;
  try {
    return await run();
  } finally {
    Platform.OS = original;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('finds the shared fixtures', () => {
  expect(fixtures.length).toBeGreaterThan(0);
});

describe.each(fixtures)('$name', ({ fixture }) => {
  it('passes the fixture input to the TurboModule unchanged', async () => {
    const adapter = adapters[fixture.method];
    if (!adapter) {
      throw new Error(`No JS adapter for ${fixture.method}`);
    }
    const { mock, args } = await adapter(fixture.input);
    expect(mock).toHaveBeenCalledTimes(1);
    const received = fromNative(mock.mock.calls[0]);
    while (received.length > args.length && received.at(-1) === undefined) {
      received.pop();
    }
    expect(received).toEqual(args);
  });
});

it('sends appInfo from package.json with initialise', async () => {
  await initStripe({ publishableKey: 'pk_test_bridge_contracts' });
  expect(native.initialise.mock.calls[0][0].appInfo).toEqual(
    expect.objectContaining({
      name: pjson.name,
      version: pjson.version,
    })
  );
});
