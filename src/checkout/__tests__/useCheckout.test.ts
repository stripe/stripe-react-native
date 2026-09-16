import { checkoutSession as session } from '../__fixtures__/session';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addListener } from '../../events';
import { useCheckout } from '../../hooks/useCheckout';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import type { Checkout } from '../../types/Checkout';
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

const create = NativeStripeSdk.createCheckout as jest.Mock;
const destroy = NativeStripeSdk.destroyCheckout as jest.Mock;
const email = NativeStripeSdk.updateCheckoutEmail as jest.Mock;
function emit(update: CheckoutControllerUpdate) {
  (addListener as jest.Mock).mock.calls.forEach(([name, listener]) => {
    if (name === 'checkoutControllerDidUpdate') listener(update);
  });
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
  (addListener as jest.Mock)
    .mockClear()
    .mockImplementation(() => ({ remove: jest.fn() }));
  create.mockReset().mockImplementation(async (_, controllerId) => ({
    controllerId,
    session,
  }));
  destroy.mockReset().mockResolvedValue(undefined);
  email.mockReset().mockResolvedValue(undefined);
  (NativeStripeSdk.runCheckoutServerUpdate as jest.Mock).mockReset();
  (NativeStripeSdk.completeCheckoutServerUpdate as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
});

it('loads only when enabled and keeps methods stable across native updates and renders', async () => {
  const configuration = jest.fn(async () => options);
  const { result, rerender, unmount } = renderHook(
    ({ enabled }: { enabled: boolean }) =>
      useCheckout({ enabled, getConfiguration: configuration }),
    { initialProps: { enabled: false } }
  );
  expect(result.current.status).toBe('idle');
  await result.current.reload();
  expect(configuration).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  const updateEmail = result.current.updateEmail;
  const updated = { ...session, email: 'native@example.com' };
  act(() =>
    emit({
      controllerId: create.mock.calls[0][1],
      status: 'updating',
      session: updated,
    })
  );
  expect(result.current.session).toBe(updated);
  expect(result.current.status).toBe('updating');
  await result.current.updateEmail('jenny@example.com');
  expect(email).toHaveBeenCalledWith(
    create.mock.calls[0][1],
    'jenny@example.com'
  );
  rerender({ enabled: true });
  expect(result.current.updateEmail).toBe(updateEmail);
  expect(configuration).toHaveBeenCalledTimes(1);
  unmount();
  await waitFor(() =>
    expect(destroy).toHaveBeenCalledWith(create.mock.calls[0][1])
  );
});

it('uses the latest configuration on reload and rejects old controller events', async () => {
  const first = jest.fn(async () => options);
  const next = jest.fn(async () => ({
    ...options,
    clientSecret: 'new-secret',
  }));
  const { result, rerender } = renderHook(
    ({ getConfiguration }: Pick<Checkout.UseOptions, 'getConfiguration'>) =>
      useCheckout({ getConfiguration }),
    { initialProps: { getConfiguration: first } }
  );
  await waitFor(() => expect(result.current.status).toBe('ready'));
  const reload = result.current.reload;
  rerender({ getConfiguration: next });
  expect(next).not.toHaveBeenCalled();
  await act(async () => {
    await reload();
  });
  expect(destroy).toHaveBeenCalledWith(create.mock.calls[0][1]);
  expect(create).toHaveBeenLastCalledWith(
    {
      ...options,
      clientSecret: 'new-secret',
    },
    create.mock.calls[1][1]
  );
  act(() =>
    emit({
      controllerId: create.mock.calls[0][1],
      status: 'updating',
      session: { ...session, email: 'stale' },
    })
  );
  expect(result.current.status).toBe('ready');
  expect(result.current.session).toBe(session);
  expect(result.current.reload).toBe(reload);
});

it('waits for destruction when reload is called repeatedly', async () => {
  const { result } = renderHook(() =>
    useCheckout({ getConfiguration: async () => options })
  );
  await waitFor(() => expect(result.current.status).toBe('ready'));
  const disposal = deferred<void>();
  destroy.mockReturnValueOnce(disposal.promise);
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.reload();
    second = result.current.reload();
  });
  expect(create).toHaveBeenCalledTimes(1);
  await act(async () => {
    disposal.resolve();
    await Promise.all([first, second]);
  });
  expect(create).toHaveBeenCalledTimes(2);
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe('ready');
});

it('ignores stale configuration results after reload', async () => {
  const pending = deferred<Checkout.CreateOptions>();
  const configuration = jest
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(options);
  const { result } = renderHook(() =>
    useCheckout({ getConfiguration: configuration })
  );
  await waitFor(() => expect(configuration).toHaveBeenCalledTimes(1));
  await act(async () => {
    await result.current.reload();
  });
  await act(async () => {
    pending.resolve({ ...options, clientSecret: 'stale' });
  });
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(options, expect.any(String));
});

it.each(['disable', 'unmount'] as const)(
  'destroys a controller that finishes creation after %s',
  async (action) => {
    const pending = deferred<{
      controllerId: string;
      session: Checkout.Session;
    }>();
    create.mockReturnValueOnce(pending.promise);
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useCheckout({ enabled, getConfiguration: async () => options }),
      { initialProps: { enabled: true } }
    );
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    if (action === 'disable') {
      rerender({ enabled: false });
    } else {
      unmount();
    }
    await act(async () => {
      pending.resolve({ controllerId: 'controller-1', session });
    });
    expect(destroy).toHaveBeenCalledWith(create.mock.calls[0][1]);
  }
);

it('exposes initialization errors and recovers on reload', async () => {
  const error = Object.assign(new Error('Expired secret'), {
    code: 'InvalidClientSecret',
  });
  create.mockRejectedValueOnce(error);
  const { result } = renderHook(() =>
    useCheckout({ getConfiguration: async () => options })
  );
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.error).toMatchObject({
    code: 'InvalidClientSecret',
    message: 'Expired secret',
  });
  await act(async () => {
    await result.current.reload();
  });
  expect(result.current.status).toBe('ready');
  expect(result.current.error).toBeNull();
});

it.each(['reload', 'unmount'] as const)(
  'settles an active server update during %s and ignores its late completion',
  async (action) => {
    const native = deferred<void>();
    const server = deferred<void>();
    const start = NativeStripeSdk.runCheckoutServerUpdate as jest.Mock;
    start.mockReturnValue(native.promise);
    const { result, unmount } = renderHook(() =>
      useCheckout({ getConfiguration: async () => options })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const pending = result.current.runServerUpdate(() => server.promise);
    const settled = pending.catch((error: unknown) => error);
    const [controllerId, operationId] = start.mock.calls[0];
    const request = (addListener as jest.Mock).mock.calls.find(
      ([name]) => name === 'checkoutServerUpdateRequested'
    )![1];
    await act(async () => {
      request({ controllerId, operationId });
    });
    destroy.mockImplementationOnce(async () => {
      native.reject(
        Object.assign(new Error('Controller destroyed'), { code: 'Canceled' })
      );
    });
    if (action === 'reload') {
      await act(async () => {
        await result.current.reload();
      });
    } else {
      act(() => {
        unmount();
      });
    }
    await act(async () => {
      expect(await settled).toMatchObject({
        code: 'Canceled',
        message: 'Controller destroyed',
      });
      server.resolve();
    });
    expect(destroy).toHaveBeenCalledWith(controllerId);
    expect(NativeStripeSdk.completeCheckoutServerUpdate).not.toHaveBeenCalled();
    if (action === 'reload') {
      expect(result.current.status).toBe('ready');
      expect(create.mock.calls[1][1]).not.toBe(controllerId);
    }
  }
);
