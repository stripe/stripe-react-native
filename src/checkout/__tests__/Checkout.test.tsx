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
    updateCheckoutEmail: jest.fn(),
    updateCheckoutShippingAddress: jest.fn(),
    applyCheckoutPromotionCode: jest.fn(),
    removeCheckoutPromotionCode: jest.fn(),
    clearCheckoutPaymentOption: jest.fn(),
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
const mockedUpdateEmail = NativeStripeSdk.updateCheckoutEmail as jest.Mock;
const mockedUpdateShippingAddress =
  NativeStripeSdk.updateCheckoutShippingAddress as jest.Mock;
const mockedApplyPromotionCode =
  NativeStripeSdk.applyCheckoutPromotionCode as jest.Mock;
const mockedRemovePromotionCode =
  NativeStripeSdk.removeCheckoutPromotionCode as jest.Mock;
const mockedClearPaymentOption =
  NativeStripeSdk.clearCheckoutPaymentOption as jest.Mock;

const mutationMocks = [
  mockedUpdateEmail,
  mockedUpdateShippingAddress,
  mockedApplyPromotionCode,
  mockedRemovePromotionCode,
  mockedClearPaymentOption,
];

describe('Checkout private preview', () => {
  beforeEach(() => {
    mockListeners.clear();
    mockSelectionListeners.clear();
    mockedCreateCheckout.mockReset();
    mockedDestroyCheckout.mockReset().mockResolvedValue(undefined);
    mutationMocks.forEach((mock) => mock.mockReset());
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
    await expect(first.updateEmail('jenny@example.com')).rejects.toMatchObject({
      code: 'Failed',
      message: 'This Checkout controller was destroyed.',
    });
    await expect(first.paymentElement.present()).rejects.toThrow(
      'This Checkout controller was destroyed.'
    );
  });

  it('runs every standard mutation through the updating lifecycle', async () => {
    mockedCreateCheckout.mockResolvedValue({
      controllerId: 'controller-1',
      session,
    });
    const controller = await createCheckout(createOptions);
    const shippingAddress: Checkout.UpdateShippingAddressParams = {
      name: 'Jenny Rosen',
      address: { country: 'US', postalCode: '94107' },
    };
    const cases: Array<{
      invoke: () => Promise<void>;
      nativeMock: jest.Mock;
      expectedArguments: unknown[];
    }> = [
      {
        invoke: () => controller.updateEmail('jenny@example.com'),
        nativeMock: mockedUpdateEmail,
        expectedArguments: ['controller-1', 'jenny@example.com'],
      },
      {
        invoke: () => controller.updateShippingAddress(shippingAddress),
        nativeMock: mockedUpdateShippingAddress,
        expectedArguments: ['controller-1', shippingAddress],
      },
      {
        invoke: () => controller.applyPromotionCode(' SAVE10 '),
        nativeMock: mockedApplyPromotionCode,
        expectedArguments: ['controller-1', ' SAVE10 '],
      },
      {
        invoke: () => controller.removePromotionCode(),
        nativeMock: mockedRemovePromotionCode,
        expectedArguments: ['controller-1'],
      },
      {
        invoke: () => controller.clearPaymentOption(),
        nativeMock: mockedClearPaymentOption,
        expectedArguments: ['controller-1'],
      },
    ];

    for (const [index, mutation] of cases.entries()) {
      const updatedSession = {
        ...controller.session,
        email: `mutation-${index}@example.com`,
      };
      mutation.nativeMock.mockImplementationOnce(async () => {
        expect(controller.status).toBe('updating');
        return { session: updatedSession };
      });

      await mutation.invoke();

      expect(mutation.nativeMock).toHaveBeenCalledWith(
        ...mutation.expectedArguments
      );
      expect(controller.status).toBe('ready');
      expect(controller.session).toBe(updatedSession);
    }
  });

  it('rejects concurrent mutations without calling native', async () => {
    mockedCreateCheckout.mockResolvedValue({
      controllerId: 'controller-1',
      session,
    });
    const controller = await createCheckout(createOptions);
    let resolveUpdate!: (value: { session: Checkout.Session }) => void;
    mockedUpdateEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    const firstMutation = controller.updateEmail('jenny@example.com');

    await expect(controller.removePromotionCode()).rejects.toMatchObject({
      code: 'Failed',
      message: 'This Checkout controller is not ready for another operation.',
    });
    expect(mockedRemovePromotionCode).not.toHaveBeenCalled();
    resolveUpdate({ session });
    await firstMutation;
    expect(controller.status).toBe('ready');
  });

  it('restores ready after a failed mutation', async () => {
    mockedCreateCheckout.mockResolvedValue({
      controllerId: 'controller-1',
      session,
    });
    const controller = await createCheckout(createOptions);
    mockedApplyPromotionCode.mockRejectedValue(new Error('Nope'));

    await controller.applyPromotionCode('SAVE10').catch(() => {});
    expect(controller.status).toBe('ready');
    expect(controller.session).toBe(session);
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
