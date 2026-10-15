import type { EventSubscription } from 'react-native';
import { CustomerSheet } from '../CustomerSheet';
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
    clientSecretProviderCustomerSessionClientSecretCallback: jest.fn(),
  },
}));

const native = jest.mocked(NativeStripeSdk);
const eventName = 'onCustomerSessionProviderCustomerSessionClientSecret';
type Handler = (event: { requestId: string }) => Promise<void>;
const listeners = new Set<Handler>();
const responses: Promise<void>[] = [];
const cleanupProviders: (() => void)[] = [];

function deferredSecret() {
  let resolve!: (value: CustomerSessionClientSecret) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<CustomerSessionClientSecret>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  cleanupProviders.push(() => resolve(secret('cleanup')));
  return { promise, resolve, reject };
}

function secret(id: string): CustomerSessionClientSecret {
  return { customerId: `cus_${id}`, clientSecret: `cuss_secret_${id}` };
}

function provider(): jest.Mocked<ClientSecretProvider> {
  return {
    provideSetupIntentClientSecret: jest.fn(),
    provideCustomerSessionClientSecret: jest.fn(),
  };
}

function initialize(merchant: ClientSecretProvider) {
  return CustomerSheet.initialize({
    merchantDisplayName: 'Test',
    intentConfiguration: { paymentMethodTypes: ['card'] },
    clientSecretProvider: merchant,
  });
}

function emit(requestId: string) {
  expect(listeners.size).toBe(1);
  const response = [...listeners][0]!({ requestId });
  // Observe rejections immediately, including when a provider finishes after cleanup.
  responses.push(response);
  response.catch(() => {});
  return response;
}

beforeEach(() => {
  jest.resetAllMocks();
  native.initCustomerSheet.mockResolvedValue({});
  native.clientSecretProviderCustomerSessionClientSecretCallback.mockResolvedValue();
  jest.mocked(addListener).mockImplementation((event, handler) => {
    const listener = handler as Handler;
    if (event === eventName) {
      listeners.add(listener);
    }
    return {
      remove: () => {
        listeners.delete(listener);
      },
    } as EventSubscription;
  });
});

afterEach(async () => {
  cleanupProviders.splice(0).forEach((complete) => complete());
  await Promise.allSettled(responses.splice(0));
  listeners.clear();
});

it.each([
  ['A', 'B'],
  ['B', 'A'],
])(
  'correlates overlapping responses in order %s then %s',
  async (first, second) => {
    const pending = { A: deferredSecret(), B: deferredSecret() };
    const merchant = provider();
    merchant.provideCustomerSessionClientSecret
      .mockReturnValueOnce(pending.A.promise)
      .mockReturnValueOnce(pending.B.promise);
    await initialize(merchant);
    const handlers = { A: emit('A'), B: emit('B') };
    expect(merchant.provideCustomerSessionClientSecret.mock.calls).toEqual([
      [],
      [],
    ]);
    expect(
      native.clientSecretProviderCustomerSessionClientSecretCallback
    ).not.toHaveBeenCalled();

    for (const id of [first, second] as ('A' | 'B')[]) {
      pending[id].resolve(secret(id));
      await handlers[id];
    }
    expect(
      native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
    ).toEqual([
      [{ requestId: first, ...secret(first) }],
      [{ requestId: second, ...secret(second) }],
    ]);
  }
);

it.each([new Error('Provider failed'), 'Provider failed'])(
  'returns a matching error response without affecting another request: %p',
  async (error) => {
    const first = deferredSecret();
    const second = deferredSecret();
    const merchant = provider();
    merchant.provideCustomerSessionClientSecret
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await initialize(merchant);
    const responseA = emit('A');
    const responseB = emit('B');
    first.reject(error);
    await responseA;
    expect(
      native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
    ).toEqual([[{ requestId: 'A', error: 'Provider failed' }]]);
    second.resolve(secret('B'));
    await responseB;
    expect(
      native.clientSecretProviderCustomerSessionClientSecretCallback
    ).toHaveBeenNthCalledWith(2, { requestId: 'B', ...secret('B') });
  }
);

it('returns a matching error when the merchant throws synchronously', async () => {
  const merchant = provider();
  merchant.provideCustomerSessionClientSecret.mockImplementation(() => {
    throw new Error('Synchronous failure');
  });
  await initialize(merchant);
  await emit('A');
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
  ).toEqual([[{ requestId: 'A', error: 'Synchronous failure' }]]);
});

it('replaces the listener while preserving IDs of already running requests', async () => {
  const pending = deferredSecret();
  const oldProvider = provider();
  oldProvider.provideCustomerSessionClientSecret.mockReturnValue(
    pending.promise
  );
  await initialize(oldProvider);
  const oldResponse = emit('old');

  const newProvider = provider();
  newProvider.provideCustomerSessionClientSecret.mockResolvedValue(
    secret('new')
  );
  await initialize(newProvider);
  await emit('new');
  pending.resolve(secret('old'));
  await oldResponse;

  expect(oldProvider.provideCustomerSessionClientSecret).toHaveBeenCalledTimes(
    1
  );
  expect(newProvider.provideCustomerSessionClientSecret).toHaveBeenCalledTimes(
    1
  );
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback.mock.calls
  ).toEqual([
    [{ requestId: 'new', ...secret('new') }],
    [{ requestId: 'old', ...secret('old') }],
  ]);
});

it('does not send a second response when the native callback rejects', async () => {
  const merchant = provider();
  merchant.provideCustomerSessionClientSecret.mockResolvedValue(secret('A'));
  await initialize(merchant);
  native.clientSecretProviderCustomerSessionClientSecretCallback.mockRejectedValueOnce(
    new Error('Bridge failed')
  );
  await expect(emit('A')).rejects.toThrow('Bridge failed');
  expect(
    native.clientSecretProviderCustomerSessionClientSecretCallback
  ).toHaveBeenCalledTimes(1);
});
