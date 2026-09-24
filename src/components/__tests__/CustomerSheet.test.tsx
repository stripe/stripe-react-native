import { CustomerSheet } from '../CustomerSheet';
import type { EventSubscription } from 'react-native';
import { addListener } from '../../events';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import type {
  ClientSecretProvider,
  CustomerSessionClientSecret,
} from '../../types/CustomerSheet';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    initCustomerSheet: jest.fn(),
    clientSecretProviderSetupIntentClientSecretCallback: jest.fn(),
    clientSecretProviderCustomerSessionClientSecretCallback: jest.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const native = jest.mocked(NativeStripeSdk);
type RequestHandler = (request: { requestId: string }) => void;
const listeners = new Map<string, Set<RequestHandler>>();
const setupEvent = 'onCustomerSessionProviderSetupIntentClientSecret';
const sessionEvent = 'onCustomerSessionProviderCustomerSessionClientSecret';

function emit(event: string, requestId: string) {
  return Promise.all(
    Array.from(listeners.get(event) ?? []).map((handler) =>
      handler({ requestId })
    )
  );
}

function initialize(merchant: ClientSecretProvider) {
  return CustomerSheet.initialize({
    merchantDisplayName: 'Test',
    intentConfiguration: { paymentMethodTypes: ['card'] },
    clientSecretProvider: merchant,
  });
}

function provider(): jest.Mocked<ClientSecretProvider> {
  return {
    provideSetupIntentClientSecret: jest.fn().mockResolvedValue('seti_secret'),
    provideCustomerSessionClientSecret: jest.fn().mockResolvedValue({
      customerId: 'cus_test',
      clientSecret: 'cuss_secret',
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  native.initCustomerSheet.mockResolvedValue({});
  native.clientSecretProviderSetupIntentClientSecretCallback.mockResolvedValue();
  native.clientSecretProviderCustomerSessionClientSecretCallback.mockResolvedValue();
  jest.mocked(addListener).mockImplementation((event, handler) => {
    const requestHandler = handler as RequestHandler;
    const handlers = listeners.get(event) ?? new Set<RequestHandler>();
    handlers.add(requestHandler);
    listeners.set(event, handlers);
    return {
      remove: () => {
        handlers.delete(requestHandler);
      },
    } as EventSubscription;
  });
});

it('correlates CustomerSession responses that finish in reverse order', async () => {
  const first = deferred<CustomerSessionClientSecret>();
  const second = deferred<CustomerSessionClientSecret>();
  const merchant = provider();
  merchant.provideCustomerSessionClientSecret
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  await initialize(merchant);

  const responseA = emit(sessionEvent, 'A');
  const responseB = emit(sessionEvent, 'B');
  expect(merchant.provideCustomerSessionClientSecret.mock.calls).toEqual([
    [],
    [],
  ]);
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback
  ).not.toHaveBeenCalled();

  second.resolve({ customerId: 'cus_B', clientSecret: 'secret_B' });
  await responseB;
  first.resolve({ customerId: 'cus_A', clientSecret: 'secret_A' });
  await responseA;
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
  ).toEqual([
    [{ requestId: 'B', customerId: 'cus_B', clientSecret: 'secret_B' }],
    [{ requestId: 'A', customerId: 'cus_A', clientSecret: 'secret_A' }],
  ]);
});

it('correlates SetupIntent responses that finish in reverse order', async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const merchant = provider();
  merchant.provideSetupIntentClientSecret
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  await initialize(merchant);

  const responseA = emit(setupEvent, 'A');
  const responseB = emit(setupEvent, 'B');
  expect(merchant.provideSetupIntentClientSecret.mock.calls).toEqual([[], []]);
  second.resolve('secret_B');
  await responseB;
  first.resolve('secret_A');
  await responseA;
  expect(
    native.clientSecretProviderSetupIntentClientSecretCallback.mock.calls
  ).toEqual([
    [{ requestId: 'B', clientSecret: 'secret_B' }],
    [{ requestId: 'A', clientSecret: 'secret_A' }],
  ]);
});

it.each([new Error('Provider failed'), 'Provider failed'])(
  'returns provider failures with their original IDs: %p',
  async (error) => {
    const merchant = provider();
    merchant.provideSetupIntentClientSecret.mockRejectedValue(error);
    merchant.provideCustomerSessionClientSecret.mockRejectedValue(error);
    await initialize(merchant);
    await emit(setupEvent, 'setup');
    await emit(sessionEvent, 'session');
    expect(
      native.clientSecretProviderSetupIntentClientSecretCallback
    ).toHaveBeenCalledWith({
      requestId: 'setup',
      error: 'Provider failed',
    });
    expect(
      native.clientSecretProviderCustomerSessionClientSecretCallback
    ).toHaveBeenCalledWith({
      requestId: 'session',
      error: 'Provider failed',
    });
  }
);

it('replaces listeners while preserving the ID of already pending responses', async () => {
  const pending = deferred<CustomerSessionClientSecret>();
  const oldProvider = provider();
  oldProvider.provideCustomerSessionClientSecret.mockReturnValue(
    pending.promise
  );
  await initialize(oldProvider);
  const oldResponse = emit(sessionEvent, 'old');

  const newProvider = provider();
  await initialize(newProvider);
  await emit(sessionEvent, 'new');
  await emit(setupEvent, 'setup');
  pending.resolve({ customerId: 'cus_old', clientSecret: 'secret_old' });
  await oldResponse;

  expect(oldProvider.provideCustomerSessionClientSecret).toHaveBeenCalledTimes(
    1
  );
  expect(newProvider.provideCustomerSessionClientSecret).toHaveBeenCalledTimes(
    1
  );
  expect(oldProvider.provideSetupIntentClientSecret).not.toHaveBeenCalled();
  expect(newProvider.provideSetupIntentClientSecret).toHaveBeenCalledTimes(1);
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
  ).toEqual([
    [{ requestId: 'new', customerId: 'cus_test', clientSecret: 'cuss_secret' }],
    [{ requestId: 'old', customerId: 'cus_old', clientSecret: 'secret_old' }],
  ]);
});

it('removes provider listeners when switching to an ephemeral key', async () => {
  const merchant = provider();
  await initialize(merchant);
  await CustomerSheet.initialize({
    merchantDisplayName: 'Test',
    customerId: 'cus_test',
    customerEphemeralKeySecret: 'ek_test',
  });
  await emit(setupEvent, 'stale');
  await emit(sessionEvent, 'stale');
  expect(merchant.provideSetupIntentClientSecret).not.toHaveBeenCalled();
  expect(merchant.provideCustomerSessionClientSecret).not.toHaveBeenCalled();
});

it('does not send a second response if the native callback rejects', async () => {
  await initialize(provider());
  native.clientSecretProviderSetupIntentClientSecretCallback.mockRejectedValueOnce(
    new Error('Bridge failed')
  );
  await expect(emit(setupEvent, 'setup')).rejects.toThrow('Bridge failed');
  expect(
    native.clientSecretProviderSetupIntentClientSecretCallback
  ).toHaveBeenCalledTimes(1);
});
