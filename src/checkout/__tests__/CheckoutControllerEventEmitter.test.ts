import { addListener } from '../../events';
import {
  addCheckoutControllerListener,
  CheckoutControllerUpdate,
  clearCheckoutControllerUpdate,
  toCheckoutControllerId,
} from '../CheckoutControllerEventEmitter';

jest.mock('../../events', () => ({
  addListener: jest.fn(),
}));

const mockedAddListener = addListener as jest.MockedFunction<
  typeof addListener
>;
const nativeListener = mockedAddListener.mock.calls[0]?.[1] as (
  update: CheckoutControllerUpdate
) => void;

const firstControllerId = toCheckoutControllerId('controller-1');
const secondControllerId = toCheckoutControllerId('controller-2');
const session = {} as CheckoutControllerUpdate['session'];

const update = (
  controllerId: CheckoutControllerUpdate['controllerId'],
  sequence: number,
  status: CheckoutControllerUpdate['status'] = 'ready'
): CheckoutControllerUpdate => ({ controllerId, sequence, status, session });

describe('CheckoutControllerEventEmitter', () => {
  beforeEach(() => {
    clearCheckoutControllerUpdate(firstControllerId);
    clearCheckoutControllerUpdate(secondControllerId);
  });

  it('registers one native listener for all controllers', () => {
    expect(mockedAddListener).toHaveBeenCalledTimes(1);
    expect(mockedAddListener).toHaveBeenCalledWith(
      'checkoutControllerDidUpdate',
      nativeListener
    );
  });

  it('replays an update emitted before the controller subscribes', () => {
    const controllerUpdate = update(firstControllerId, 1);
    const listener = jest.fn();
    nativeListener(controllerUpdate);

    const subscription = addCheckoutControllerListener(
      firstControllerId,
      listener
    );

    expect(listener).toHaveBeenCalledWith(controllerUpdate);
    subscription.remove();
  });

  it('routes live updates only to the matching controller', () => {
    const firstListener = jest.fn();
    const secondListener = jest.fn();
    const firstSubscription = addCheckoutControllerListener(
      firstControllerId,
      firstListener
    );
    const secondSubscription = addCheckoutControllerListener(
      secondControllerId,
      secondListener
    );

    nativeListener(update(firstControllerId, 1));

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).not.toHaveBeenCalled();
    firstSubscription.remove();
    secondSubscription.remove();
  });

  it('preserves sequence ordering across subscriptions', () => {
    nativeListener(update(firstControllerId, 2, 'updating'));
    const firstListener = jest.fn();
    const firstSubscription = addCheckoutControllerListener(
      firstControllerId,
      firstListener
    );
    firstSubscription.remove();

    nativeListener(update(firstControllerId, 1));
    const secondListener = jest.fn();
    const secondSubscription = addCheckoutControllerListener(
      firstControllerId,
      secondListener
    );
    nativeListener(update(firstControllerId, 3));

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 2, status: 'updating' })
    );
    expect(secondListener).toHaveBeenCalledTimes(2);
    expect(secondListener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sequence: 2, status: 'updating' })
    );
    expect(secondListener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sequence: 3, status: 'ready' })
    );
    secondSubscription.remove();
  });

  it('ignores invalid sequence numbers', () => {
    const listener = jest.fn();
    const subscription = addCheckoutControllerListener(
      firstControllerId,
      listener
    );

    nativeListener(update(firstControllerId, Number.NaN));
    nativeListener(update(firstControllerId, 0));
    nativeListener(update(firstControllerId, 1.5));

    expect(listener).not.toHaveBeenCalled();
    subscription.remove();
  });

  it('stops forwarding updates after removal', () => {
    const listener = jest.fn();
    const subscription = addCheckoutControllerListener(
      firstControllerId,
      listener
    );
    subscription.remove();

    nativeListener(update(firstControllerId, 1));

    expect(listener).not.toHaveBeenCalled();
  });

  it('forgets buffered state after the controller is cleared', () => {
    nativeListener(update(firstControllerId, 1));
    clearCheckoutControllerUpdate(firstControllerId);
    const listener = jest.fn();
    const subscription = addCheckoutControllerListener(
      firstControllerId,
      listener
    );

    expect(listener).not.toHaveBeenCalled();
    subscription.remove();
  });
});
