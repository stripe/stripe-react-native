import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addListener } from '../../events';
import { useCheckout } from '../../hooks/useCheckout';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import type { Checkout } from '../../types/Checkout';
import { checkoutSession as session } from '../__fixtures__/session';
import type { CheckoutControllerUpdate } from '../CheckoutControllerEventEmitter';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    createCheckout: jest.fn(),
    destroyCheckout: jest.fn(),
    updateCheckoutEmail: jest.fn(),
    runCheckoutServerUpdate: jest.fn(),
    completeCheckoutServerUpdate: jest.fn(),
  },
}));

const options: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret',
  returnURL: 'example://checkout',
};
const getConfiguration = async () => options;
const events = addListener as jest.Mock;
const create = NativeStripeSdk.createCheckout as jest.Mock;
const destroy = NativeStripeSdk.destroyCheckout as jest.Mock;
const updateEmail = NativeStripeSdk.updateCheckoutEmail as jest.Mock;
const startServerUpdate = NativeStripeSdk.runCheckoutServerUpdate as jest.Mock;
const completeServerUpdate =
  NativeStripeSdk.completeCheckoutServerUpdate as jest.Mock;

function renderCheckout(overrides: Partial<Checkout.UseOptions> = {}) {
  const initialProps: Checkout.UseOptions = {
    getConfiguration,
    ...overrides,
  };
  return renderHook(
    (hookOptions: Checkout.UseOptions) => useCheckout(hookOptions),
    { initialProps }
  );
}

function emit(update: CheckoutControllerUpdate) {
  events.mock.calls
    .filter(([event]) => event === 'checkoutControllerDidUpdate')
    .forEach(([, eventListener]) => eventListener(update));
}

function listener(event: string) {
  return events.mock.calls.find(([name]) => name === event)![1];
}

function controllerId(index = 0): string {
  return create.mock.calls[index][1];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  events.mockReset().mockImplementation(() => ({ remove: jest.fn() }));
  create.mockReset().mockImplementation(async (_, id) => ({
    controllerId: id,
    session,
  }));
  destroy.mockReset().mockResolvedValue(undefined);
  updateEmail.mockReset().mockResolvedValue(undefined);
  startServerUpdate.mockReset();
  completeServerUpdate.mockReset().mockResolvedValue(undefined);
});

it('loads while enabled and follows native updates', async () => {
  const configuration = jest.fn(getConfiguration);
  const hook = renderCheckout({
    enabled: false,
    getConfiguration: configuration,
  });

  expect(hook.result.current.status).toBe('idle');
  await hook.result.current.reload();
  expect(configuration).not.toHaveBeenCalled();

  hook.rerender({ enabled: true, getConfiguration: configuration });
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  const firstUpdateEmail = hook.result.current.updateEmail;
  const updated = { ...session, email: 'native@example.com' };
  act(() =>
    emit({ controllerId: controllerId(), status: 'updating', session: updated })
  );

  expect(hook.result.current).toMatchObject({
    status: 'updating',
    session: updated,
  });
  await hook.result.current.updateEmail('jenny@example.com');
  expect(updateEmail).toHaveBeenCalledWith(controllerId(), 'jenny@example.com');

  hook.rerender({ enabled: true, getConfiguration: configuration });
  expect(hook.result.current.updateEmail).toBe(firstUpdateEmail);
  expect(configuration).toHaveBeenCalledTimes(1);
  hook.unmount();
  await waitFor(() => expect(destroy).toHaveBeenCalledWith(controllerId()));
});

it('reloads with the latest configuration and ignores old events', async () => {
  const first = jest.fn(getConfiguration);
  const nextOptions = { ...options, clientSecret: 'new-secret' };
  const next = jest.fn(async () => nextOptions);
  const hook = renderCheckout({ getConfiguration: first });
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));

  const reload = hook.result.current.reload;
  hook.rerender({ getConfiguration: next });
  expect(next).not.toHaveBeenCalled();
  await act(reload);

  expect(destroy).toHaveBeenCalledWith(controllerId());
  expect(create).toHaveBeenLastCalledWith(nextOptions, controllerId(1));
  act(() =>
    emit({
      controllerId: controllerId(),
      status: 'updating',
      session: { ...session, email: 'stale' },
    })
  );
  expect(hook.result.current).toMatchObject({ status: 'ready', session });
  expect(hook.result.current.reload).toBe(reload);
});

it('ignores stale configuration results', async () => {
  const pending = deferred<Checkout.CreateOptions>();
  const configuration = jest
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(options);
  const hook = renderCheckout({ getConfiguration: configuration });
  await waitFor(() => expect(configuration).toHaveBeenCalledTimes(1));

  await act(() => hook.result.current.reload());
  await act(() => pending.resolve({ ...options, clientSecret: 'stale' }));

  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(options, expect.any(String));
});

it('destroys a controller created after unmount', async () => {
  const pending = deferred<{
    controllerId: string;
    session: Checkout.Session;
  }>();
  create.mockReturnValueOnce(pending.promise);
  const hook = renderCheckout();
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));

  hook.unmount();
  await act(() => pending.resolve({ controllerId: controllerId(), session }));

  expect(destroy).toHaveBeenCalledWith(controllerId());
});

it('reports initialization errors and recovers on reload', async () => {
  create.mockRejectedValueOnce(
    Object.assign(new Error('Expired secret'), { code: 'InvalidClientSecret' })
  );
  const hook = renderCheckout();
  await waitFor(() => expect(hook.result.current.status).toBe('error'));
  expect(hook.result.current.error).toMatchObject({
    code: 'InvalidClientSecret',
    message: 'Expired secret',
  });

  await act(() => hook.result.current.reload());
  expect(hook.result.current).toMatchObject({ status: 'ready', error: null });
});

it('cancels an active server update during reload', async () => {
  const native = deferred<void>();
  const server = deferred<void>();
  startServerUpdate.mockReturnValue(native.promise);
  const hook = renderCheckout();
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));

  const update = hook.result.current.runServerUpdate(() => server.promise);
  const settled = update.catch((error: unknown) => error);
  const [id, operationId] = startServerUpdate.mock.calls[0];
  await act(() =>
    listener('checkoutServerUpdateRequested')({
      controllerId: id,
      operationId,
    })
  );
  destroy.mockImplementationOnce(async () => {
    native.reject(
      Object.assign(new Error('Controller destroyed'), { code: 'Canceled' })
    );
  });

  await act(() => hook.result.current.reload());
  await act(async () => {
    expect(await settled).toMatchObject({
      code: 'Canceled',
      message: 'Controller destroyed',
    });
    server.resolve();
  });

  expect(destroy).toHaveBeenCalledWith(id);
  expect(completeServerUpdate).not.toHaveBeenCalled();
  expect(hook.result.current.status).toBe('ready');
  expect(controllerId(1)).not.toBe(id);
});
