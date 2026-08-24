import type { EventSubscription } from 'react-native';
import { addListener } from '../../events';
import {
  addCheckoutControllerListener,
  CheckoutControllerUpdate,
  toCheckoutControllerId,
} from '../CheckoutControllerEventEmitter';

jest.mock('../../events', () => ({
  addListener: jest.fn(),
}));

const mockedAddListener = addListener as jest.MockedFunction<
  typeof addListener
>;

const session = {} as CheckoutControllerUpdate['session'];

describe('CheckoutControllerEventEmitter', () => {
  let nativeListener: (update: CheckoutControllerUpdate) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAddListener.mockImplementation((_event, listener) => {
      nativeListener = listener as typeof nativeListener;
      return { remove } as unknown as EventSubscription;
    });
  });

  it('forwards updates for the subscribed controller', () => {
    const controllerId = toCheckoutControllerId('controller-1');
    const listener = jest.fn();
    const update: CheckoutControllerUpdate = {
      controllerId,
      sequence: 1,
      status: 'ready',
      session,
    };

    addCheckoutControllerListener(controllerId, listener);
    nativeListener(update);

    expect(listener).toHaveBeenCalledWith(update);
  });

  it('ignores updates for other controllers', () => {
    const listener = jest.fn();

    addCheckoutControllerListener(
      toCheckoutControllerId('controller-1'),
      listener
    );
    nativeListener({
      controllerId: toCheckoutControllerId('controller-2'),
      sequence: 1,
      status: 'ready',
      session,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores duplicate, stale, and invalid sequence numbers', () => {
    const controllerId = toCheckoutControllerId('controller-1');
    const listener = jest.fn();

    addCheckoutControllerListener(controllerId, listener);
    nativeListener({ controllerId, sequence: 2, status: 'updating', session });
    nativeListener({ controllerId, sequence: 2, status: 'ready', session });
    nativeListener({ controllerId, sequence: 1, status: 'ready', session });
    nativeListener({
      controllerId,
      sequence: Number.NaN,
      status: 'ready',
      session,
    });
    nativeListener({ controllerId, sequence: 3, status: 'ready', session });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sequence: 2, status: 'updating' })
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sequence: 3, status: 'ready' })
    );
  });

  it('returns the native event subscription', () => {
    const subscription = addCheckoutControllerListener(
      toCheckoutControllerId('controller-1'),
      jest.fn()
    );

    subscription.remove();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
