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
    confirmCheckout: jest.fn(),
  },
}));

const options: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret',
  returnURL: 'example://checkout',
};

const listeners = new Map<string, Set<(event: any) => void>>();
const create = NativeStripeSdk.createCheckout as jest.Mock;
const destroy = NativeStripeSdk.destroyCheckout as jest.Mock;
const present = NativeStripeSdk.presentCheckoutPaymentElement as jest.Mock;

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
  expect(selected).toHaveBeenCalledTimes(1);
  expect(second.status).toBe('ready');
  await first.destroy();
  expect(destroy).toHaveBeenCalledTimes(1);
  await second.destroy();
});

it('forwards mutations and preserves native errors', async () => {
  const controller = await createCheckout(options);
  const id = create.mock.calls[0][1];
  const address = { address: { country: 'US' } };
  await controller.updateEmail(null);
  await controller.updateShippingAddress(address);
  await controller.applyPromotionCode(' SAVE10 ');
  await controller.removePromotionCode();
  await controller.clearPaymentOption();
  expect(NativeStripeSdk.updateCheckoutEmail).toHaveBeenCalledWith(id, null);
  expect(NativeStripeSdk.updateCheckoutShippingAddress).toHaveBeenCalledWith(
    id,
    address
  );
  expect(NativeStripeSdk.applyCheckoutPromotionCode).toHaveBeenCalledWith(
    id,
    'SAVE10'
  );
  expect(NativeStripeSdk.removeCheckoutPromotionCode).toHaveBeenCalledWith(id);
  expect(NativeStripeSdk.clearCheckoutPaymentOption).toHaveBeenCalledWith(id);
  const updateEmail = NativeStripeSdk.updateCheckoutEmail as jest.Mock;
  const canceled = Object.assign(new Error('Canceled'), { code: 'Canceled' });
  updateEmail.mockRejectedValueOnce(canceled);
  await expect(controller.updateEmail(null)).rejects.toBe(canceled);

  updateEmail.mockRejectedValueOnce(new Error('Unknown native error'));
  await expect(controller.updateEmail(null)).rejects.toMatchObject({
    code: 'Failed',
    message: 'Unknown native error',
  });

  const error = Object.assign(new Error('No presenter'), { code: 'Failed' });
  present.mockRejectedValueOnce(error);
  await expect(controller.paymentElement.present()).rejects.toBe(error);
  await controller.paymentElement.present();
  await controller.paymentElement.present();
  expect(present).toHaveBeenCalledTimes(3);
  await controller.destroy();
  await controller.destroy();
  expect(destroy).toHaveBeenCalledTimes(1);
  await expect(controller.paymentElement.present()).rejects.toThrow(
    'destroyed'
  );
  expect(present).toHaveBeenCalledTimes(3);
});

it('removes listeners when creation fails', async () => {
  const error = new Error('Invalid client secret');
  create.mockRejectedValueOnce(error);
  await expect(createCheckout(options)).rejects.toBe(error);
  expect(
    [...listeners.values()].every((callbacks) => callbacks.size === 0)
  ).toBe(true);
});

it('returns native confirmation outcomes and preserves rejection errors', async () => {
  const controller = await createCheckout(options);
  const id = create.mock.calls[0][1];
  const confirm = NativeStripeSdk.confirmCheckout as jest.Mock;
  const failure = { code: 'Failed', message: 'Payment declined' };
  for (const result of [
    { status: 'completed', paymentStatus: 'paid' },
    { status: 'canceled' },
    { status: 'failed', error: failure },
  ]) {
    confirm.mockResolvedValueOnce(result);
    await expect(controller.confirm()).resolves.toBe(result);
    expect(confirm).toHaveBeenLastCalledWith(id);
  }
  const error = Object.assign(new Error('Confirmation already active'), {
    code: 'Failed',
  });
  confirm.mockRejectedValueOnce(error);
  await expect(controller.confirm()).rejects.toBe(error);
  await controller.destroy();
  await expect(controller.confirm()).rejects.toThrow('destroyed');
  expect(confirm).toHaveBeenCalledTimes(4);
});
