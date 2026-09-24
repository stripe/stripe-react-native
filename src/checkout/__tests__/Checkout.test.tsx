import { checkoutSession as session } from '../__fixtures__/session';
import { addListener } from '../../events';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import type { Checkout } from '../../types/Checkout';
import { createCheckout } from '../createCheckout';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    createCheckout: jest.fn(),
    destroyCheckout: jest.fn(),
    updateCheckoutEmail: jest.fn(),
    updateCheckoutShippingAddress: jest.fn(),
    applyCheckoutPromotionCode: jest.fn(),
    removeCheckoutPromotionCode: jest.fn(),
    clearCheckoutPaymentOption: jest.fn(),
    presentCheckoutPaymentElement: jest.fn(),
  },
}));

const options: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret',
  returnURL: 'example://checkout',
};

const listeners = new Map<string, Set<(event: any) => void>>();
const create = NativeStripeSdk.createCheckout as jest.Mock;
const destroy = NativeStripeSdk.destroyCheckout as jest.Mock;

function emit(name: string, event: object) {
  listeners.get(name)?.forEach((listener) => listener(event));
}

beforeEach(() => {
  listeners.clear();
  (addListener as jest.Mock).mockImplementation((name, listener) => {
    const callbacks = listeners.get(name) ?? new Set();
    listeners.set(name, callbacks);
    callbacks.add(listener);
    return { remove: () => callbacks.delete(listener) };
  });
  for (const method of Object.values(NativeStripeSdk)) {
    (method as jest.Mock).mockReset().mockResolvedValue(undefined);
  }
  create.mockImplementation(async () => ({ session }));
});

it('keeps initial snapshots and routes updates and selection to the owning controller', async () => {
  const selected = jest.fn();
  const updated = { ...session, email: 'updated@example.com' };
  create.mockImplementationOnce(async (_, controllerId) => {
    emit('checkoutControllerDidUpdate', {
      controllerId,
      status: 'updating',
      session: updated,
    });
    return { session };
  });
  const first = await createCheckout({
    ...options,
    paymentElement: {
      rowSelectionBehavior: {
        type: 'immediateAction',
        onSelectPaymentOption: selected,
      },
    },
  });
  const second = await createCheckout(options);
  const firstId = create.mock.calls[0][1];
  expect(firstId).not.toBe(create.mock.calls[1][1]);
  expect(first.session).toBe(updated);
  expect(first.status).toBe('updating');
  expect(second.session).toBe(session);
  expect(create.mock.calls[0][0].paymentElement.rowSelectionBehavior).toEqual({
    type: 'immediateAction',
  });
  emit('checkoutControllerDidSelectPaymentOption', { controllerId: firstId });
  expect(selected).toHaveBeenCalledTimes(1);
  await first.destroy();
  emit('checkoutControllerDidUpdate', {
    controllerId: firstId,
    status: 'ready',
    session,
  });
  emit('checkoutControllerDidSelectPaymentOption', { controllerId: firstId });
  expect(first.status).toBe('destroyed');
  expect(destroy).toHaveBeenCalledWith(firstId);
  expect(selected).toHaveBeenCalledTimes(1);
  expect(second.status).toBe('ready');
  await first.destroy();
  expect(destroy).toHaveBeenCalledTimes(1);
  await second.destroy();
});

it('removes listeners when creation fails', async () => {
  const error = new Error('Invalid client secret');
  create.mockRejectedValueOnce(error);
  await expect(createCheckout(options)).rejects.toBe(error);
  expect(
    [...listeners.values()].every((callbacks) => callbacks.size === 0)
  ).toBe(true);
});
