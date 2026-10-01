import { Platform } from 'react-native';
import { addListener } from '../../events';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import { CustomerSheet } from '../CustomerSheet';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    initCustomerSheet: jest.fn(),
    customerSheetClientSecretProviderResponse: jest.fn(),
    clientSecretProviderSetupIntentClientSecretCallback: jest.fn(),
    clientSecretProviderCustomerSessionClientSecretCallback: jest.fn(),
  },
}));

const originalPlatform = Platform.OS;
const listeners = new Map<
  string,
  (event?: { requestId: string }) => Promise<void>
>();
const response =
  NativeStripeSdk.customerSheetClientSecretProviderResponse as jest.Mock;

beforeEach(() => {
  Platform.OS = 'ios';
  listeners.clear();
  (addListener as jest.Mock).mockImplementation((name, listener) => {
    listeners.set(name, listener);
    return { remove: () => listeners.delete(name) };
  });
  for (const method of Object.values(NativeStripeSdk)) {
    (method as jest.Mock).mockReset().mockResolvedValue(undefined);
  }
  (NativeStripeSdk.initCustomerSheet as jest.Mock).mockResolvedValue({});
});

afterEach(() => {
  Platform.OS = originalPlatform;
});

it('returns overlapping CustomerSession secrets to their matching request IDs', async () => {
  let resolveFirst!: (value: {
    customerId: string;
    clientSecret: string;
  }) => void;
  let resolveSecond!: (value: {
    customerId: string;
    clientSecret: string;
  }) => void;
  const provider = {
    provideSetupIntentClientSecret: jest.fn(),
    provideCustomerSessionClientSecret: jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      ),
  };
  await CustomerSheet.initialize({
    intentConfiguration: {},
    clientSecretProvider: provider,
  });
  const listener = listeners.get(
    'onCustomerSessionProviderCustomerSessionClientSecret'
  )!;

  const first = listener({ requestId: 'first' });
  const second = listener({ requestId: 'second' });
  resolveSecond({ customerId: 'cus_2', clientSecret: 'second-secret' });
  await second;
  expect(response).toHaveBeenNthCalledWith(1, {
    requestId: 'second',
    type: 'customerSession',
    customerId: 'cus_2',
    clientSecret: 'second-secret',
  });

  resolveFirst({ customerId: 'cus_1', clientSecret: 'first-secret' });
  await first;
  expect(response).toHaveBeenNthCalledWith(2, {
    requestId: 'first',
    type: 'customerSession',
    customerId: 'cus_1',
    clientSecret: 'first-secret',
  });
});

it('returns a provider error to the matching iOS request', async () => {
  await CustomerSheet.initialize({
    intentConfiguration: {},
    clientSecretProvider: {
      provideSetupIntentClientSecret: jest
        .fn()
        .mockRejectedValue(new Error('backend failed')),
      provideCustomerSessionClientSecret: jest.fn(),
    },
  });

  await listeners.get('onCustomerSessionProviderSetupIntentClientSecret')!({
    requestId: 'setup-1',
  });
  expect(response).toHaveBeenCalledWith({
    requestId: 'setup-1',
    type: 'setupIntent',
    error: 'backend failed',
  });
});

it('keeps the Android provider callback path', async () => {
  Platform.OS = 'android';
  await CustomerSheet.initialize({
    intentConfiguration: {},
    clientSecretProvider: {
      provideSetupIntentClientSecret: jest
        .fn()
        .mockResolvedValue('seti_secret'),
      provideCustomerSessionClientSecret: jest.fn(),
    },
  });

  await listeners.get('onCustomerSessionProviderSetupIntentClientSecret')!(
    undefined
  );
  expect(
    NativeStripeSdk.clientSecretProviderSetupIntentClientSecretCallback
  ).toHaveBeenCalledWith('seti_secret');
  expect(response).not.toHaveBeenCalled();
});
