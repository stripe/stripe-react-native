import { renderHook } from '@testing-library/react-native';
import { CheckoutPaymentElementView } from '../../components/CheckoutPaymentElementView';
import { useCheckout } from '../../hooks/useCheckout';
import type { Checkout, CheckoutPaymentElement } from '../../types/Checkout';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import type { CheckoutControllerUpdate } from '../CheckoutControllerEventEmitter';
import { createCheckout } from '../createCheckout';

const mockListeners = new Map<
  string,
  (update: CheckoutControllerUpdate) => void
>();
const mockSelectionListeners = new Map<string, () => void>();

jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    createCheckout: jest.fn(),
    destroyCheckout: jest.fn(),
  },
}));

jest.mock('../CheckoutControllerEventEmitter', () => ({
  addCheckoutControllerListener: jest.fn(
    (
      controllerId: string,
      listener: (update: CheckoutControllerUpdate) => void
    ) => {
      mockListeners.set(controllerId, listener);
      return { remove: () => mockListeners.delete(controllerId) };
    }
  ),
  addCheckoutControllerSelectionListener: jest.fn(
    (controllerId: string, listener?: () => void) => {
      if (listener) {
        mockSelectionListeners.set(controllerId, listener);
      }
      return { remove: () => mockSelectionListeners.delete(controllerId) };
    }
  ),
  clearCheckoutControllerUpdate: jest.fn(),
  toCheckoutControllerId: (controllerId: string) => controllerId,
}));

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';

const createOptions: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret_example',
  returnURL: 'example://stripe-redirect',
};
const session = {
  id: 'cs_test',
  livemode: false,
  currency: 'usd',
  orderSummaryItems: [],
  discountAmounts: [],
  totals: {},
  status: { type: 'open' },
} as unknown as Checkout.Session;

const mockedCreateCheckout = NativeStripeSdk.createCheckout as jest.Mock;
const mockedDestroyCheckout = NativeStripeSdk.destroyCheckout as jest.Mock;

describe('Checkout private preview', () => {
  beforeEach(() => {
    mockListeners.clear();
    mockSelectionListeners.clear();
    mockedCreateCheckout.mockReset();
    mockedDestroyCheckout.mockReset().mockResolvedValue(undefined);
  });

  it('creates a stable controller and applies native snapshots', async () => {
    const onSelectPaymentOption = jest.fn();
    mockedCreateCheckout.mockResolvedValue({
      controllerId: 'controller-1',
      session,
    });

    const controller = await createCheckout({
      ...createOptions,
      paymentElement: {
        rowSelectionBehavior: {
          type: 'immediateAction',
          onSelectPaymentOption,
        },
      },
    });
    const paymentElement = controller.paymentElement;
    const updatedSession = { ...session, email: 'jenny@example.com' };
    mockListeners.get('controller-1')?.({
      controllerId: 'controller-1' as never,
      sequence: 2,
      status: 'updating',
      session: updatedSession,
    });
    mockSelectionListeners.get('controller-1')?.();

    expect(mockedCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentElement: { rowSelectionBehavior: { type: 'immediateAction' } },
      })
    );
    expect(controller.status).toBe('updating');
    expect(controller.session).toBe(updatedSession);
    expect(controller.paymentElement).toBe(paymentElement);
    expect(onSelectPaymentOption).toHaveBeenCalledTimes(1);
  });

  it('destroys once and rejects subsequent operations', async () => {
    mockedCreateCheckout
      .mockResolvedValueOnce({ controllerId: 'controller-1', session })
      .mockResolvedValueOnce({ controllerId: 'controller-2', session });
    const first = await createCheckout(createOptions);
    const second = await createCheckout(createOptions);

    await Promise.all([first.destroy(), first.destroy(), second.destroy()]);

    expect(mockedDestroyCheckout).toHaveBeenCalledTimes(2);
    expect(first.status).toBe('destroyed');
    await expect(first.updateEmail('jenny@example.com')).rejects.toThrow(
      'This Checkout controller was destroyed.'
    );
    await expect(first.paymentElement.present()).rejects.toThrow(
      'This Checkout controller was destroyed.'
    );
  });

  it('stays idle while the hook is disabled', () => {
    const getConfiguration = jest.fn(async () => createOptions);
    const { result } = renderHook(() =>
      useCheckout({ enabled: false, getConfiguration })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(getConfiguration).not.toHaveBeenCalled();
  });

  it('reports the missing native implementation when enabled', async () => {
    const getConfiguration = jest.fn(async () => createOptions);
    const { result } = renderHook(() => useCheckout({ getConfiguration }));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual({
      code: 'Failed',
      message: CHECKOUT_NOT_IMPLEMENTED_MESSAGE,
    });
    expect(getConfiguration).not.toHaveBeenCalled();
    await expect(result.current.reload()).rejects.toThrow(
      CHECKOUT_NOT_IMPLEMENTED_MESSAGE
    );
  });

  it('throws when the inline Payment Element stub is rendered', () => {
    const element: CheckoutPaymentElement = {
      present: () => Promise.resolve(),
    };

    expect(() => CheckoutPaymentElementView({ element })).toThrow(
      CHECKOUT_NOT_IMPLEMENTED_MESSAGE
    );
  });
});
