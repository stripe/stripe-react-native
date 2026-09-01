import type { Checkout, CheckoutController } from '../types/Checkout';
import type { StripeError } from '../types/Errors';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
  clearCheckoutControllerUpdate,
  toCheckoutControllerId,
} from './CheckoutControllerEventEmitter';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';
const CHECKOUT_DESTROYED_MESSAGE = 'This Checkout controller was destroyed.';
const CHECKOUT_MUTATION_IN_PROGRESS_MESSAGE =
  'This Checkout controller is not ready for another operation.';

type CheckoutOperationError = Error & StripeError<Checkout.ErrorCode>;

const checkoutErrorCodes = new Set<Checkout.ErrorCode>([
  'Failed',
  'InvalidClientSecret',
  'SessionNotOpen',
  'SheetCurrentlyPresented',
  'Timeout',
  'Canceled',
]);

function checkoutError(
  code: Checkout.ErrorCode,
  message: string
): CheckoutOperationError {
  const error = new Error(message) as CheckoutOperationError;
  error.code = code;
  return error;
}

function normalizeCheckoutError(error: unknown): CheckoutOperationError {
  if (error instanceof Error) {
    const code = (error as Partial<CheckoutOperationError>).code;
    if (code && checkoutErrorCodes.has(code)) {
      return error as CheckoutOperationError;
    }
    return checkoutError('Failed', error.message);
  }
  return checkoutError('Failed', String(error));
}

function nativeCreateOptions(
  options: Checkout.CreateOptions
): Checkout.CreateOptions {
  const rowSelectionBehavior = options.paymentElement?.rowSelectionBehavior;
  if (!rowSelectionBehavior || rowSelectionBehavior.type === 'default') {
    return options;
  }

  return {
    ...options,
    paymentElement: {
      ...options.paymentElement,
      rowSelectionBehavior: { type: rowSelectionBehavior.type },
    },
  };
}

/**
 * Creates a controller for one Checkout Session. The caller owns the
 * controller lifecycle and must destroy it when it is no longer needed.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export async function createCheckout(
  options: Checkout.CreateOptions
): Promise<CheckoutController> {
  const result = await NativeStripeSdk.createCheckout(
    nativeCreateOptions(options)
  );
  const controllerId = toCheckoutControllerId(result.controllerId);
  let status: CheckoutController['status'] = 'ready';
  let session = result.session;
  let destroyed = false;
  let mutationInProgress = false;
  let destroyPromise: Promise<void> | undefined;

  const assertActive = () => {
    if (destroyed) {
      throw checkoutError('Failed', CHECKOUT_DESTROYED_MESSAGE);
    }
  };
  const notImplemented = async (): Promise<never> => {
    assertActive();
    throw new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
  };
  const performMutation = async (
    operation: () => Promise<{ session: Checkout.Session }>
  ): Promise<void> => {
    assertActive();
    if (mutationInProgress || status !== 'ready') {
      throw checkoutError('Failed', CHECKOUT_MUTATION_IN_PROGRESS_MESSAGE);
    }

    mutationInProgress = true;
    status = 'updating';
    try {
      const mutationResult = await operation();
      assertActive();
      session = mutationResult.session;
    } catch (error) {
      throw normalizeCheckoutError(error);
    } finally {
      mutationInProgress = false;
      if (!destroyed && status === 'updating') {
        status = 'ready';
      }
    }
  };

  const subscription = addCheckoutControllerListener(controllerId, (update) => {
    if (destroyed) {
      return;
    }
    status = update.status;
    session = update.session;
    if (update.status === 'destroyed') {
      destroyed = true;
    }
  });
  const selectionSubscription = addCheckoutControllerSelectionListener(
    controllerId,
    options.paymentElement?.rowSelectionBehavior?.type === 'immediateAction'
      ? options.paymentElement.rowSelectionBehavior.onSelectPaymentOption
      : undefined
  );

  const paymentElement = {
    // TODO(porter): Present the native Payment Element sheet.
    present: notImplemented,
  };

  return {
    get status() {
      return status;
    },
    get session() {
      return session;
    },
    paymentElement,
    updateEmail: (email) =>
      performMutation(() =>
        NativeStripeSdk.updateCheckoutEmail(controllerId, email)
      ),
    updateShippingAddress: (params) =>
      performMutation(() =>
        NativeStripeSdk.updateCheckoutShippingAddress(controllerId, params)
      ),
    applyPromotionCode: (promotionCode) =>
      performMutation(() =>
        NativeStripeSdk.applyCheckoutPromotionCode(controllerId, promotionCode)
      ),
    removePromotionCode: () =>
      performMutation(() =>
        NativeStripeSdk.removeCheckoutPromotionCode(controllerId)
      ),
    // TODO(porter): Bridge the Checkout server-update handshake.
    runServerUpdate: notImplemented,
    clearPaymentOption: () =>
      performMutation(() =>
        NativeStripeSdk.clearCheckoutPaymentOption(controllerId)
      ),
    // TODO(porter): Bridge Checkout confirmation.
    confirm: notImplemented,
    destroy: () => {
      if (destroyPromise) {
        return destroyPromise;
      }
      if (destroyed) {
        return Promise.resolve();
      }

      destroyed = true;
      status = 'destroyed';
      subscription.remove();
      selectionSubscription.remove();
      clearCheckoutControllerUpdate(controllerId);
      destroyPromise = NativeStripeSdk.destroyCheckout(controllerId);
      return destroyPromise;
    },
  };
}
