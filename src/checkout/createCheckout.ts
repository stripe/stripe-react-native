import type { Checkout, CheckoutController } from '../types/Checkout';
import type { StripeError } from '../types/Errors';
import { runServerUpdate } from './runServerUpdate';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
  createCheckoutId,
} from './CheckoutControllerEventEmitter';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';
const CHECKOUT_DESTROYED_MESSAGE = 'This Checkout controller was destroyed.';

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
  const controllerId = createCheckoutId();
  let status: CheckoutController['status'] = 'ready';
  let session: Checkout.Session | undefined;
  let destroyPromise: Promise<void> | undefined;
  // Subscribe before creating native so initial updates cannot be lost.
  const subscription = addCheckoutControllerListener(controllerId, (update) => {
    if (status !== 'destroyed') {
      status = update.status;
      session = update.session;
    }
  });
  const selectionSubscription = addCheckoutControllerSelectionListener(
    controllerId,
    options.paymentElement?.rowSelectionBehavior?.type === 'immediateAction'
      ? options.paymentElement.rowSelectionBehavior.onSelectPaymentOption
      : undefined
  );
  try {
    const result = await NativeStripeSdk.createCheckout(
      nativeCreateOptions(options),
      controllerId
    );
    session ??= result.session;

    const assertActive = () => {
      if (status === 'destroyed') {
        throw checkoutError('Failed', CHECKOUT_DESTROYED_MESSAGE);
      }
    };
    const notImplemented = async (): Promise<never> => {
      assertActive();
      throw new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
    };

    const performOperation = async (
      operation: () => Promise<void>
    ): Promise<void> => {
      assertActive();
      try {
        await operation();
        assertActive();
      } catch (error) {
        throw normalizeCheckoutError(error);
      }
    };

    const paymentElement = {
      // TODO(porter): Present the native Payment Element sheet.
      present: notImplemented,
    };

    return {
      get status() {
        return status;
      },
      get session() {
        return session!;
      },
      paymentElement,
      updateEmail: (email) =>
        performOperation(() =>
          NativeStripeSdk.updateCheckoutEmail(controllerId, email)
        ),
      updateShippingAddress: (params) =>
        performOperation(() =>
          NativeStripeSdk.updateCheckoutShippingAddress(controllerId, params)
        ),
      applyPromotionCode: (promotionCode) =>
        performOperation(() =>
          NativeStripeSdk.applyCheckoutPromotionCode(
            controllerId,
            promotionCode.trim()
          )
        ),
      removePromotionCode: () =>
        performOperation(() =>
          NativeStripeSdk.removeCheckoutPromotionCode(controllerId)
        ),
      runServerUpdate: (serverUpdate) =>
        performOperation(() => runServerUpdate(controllerId, serverUpdate)),
      clearPaymentOption: () =>
        performOperation(() =>
          NativeStripeSdk.clearCheckoutPaymentOption(controllerId)
        ),
      // TODO(porter): Bridge Checkout confirmation.
      confirm: notImplemented,
      destroy: () => {
        if (destroyPromise) {
          return destroyPromise;
        }
        if (status === 'destroyed') {
          return Promise.resolve();
        }

        status = 'destroyed';
        subscription.remove();
        selectionSubscription.remove();
        destroyPromise = Promise.resolve().then(() =>
          NativeStripeSdk.destroyCheckout(controllerId)
        );
        return destroyPromise;
      },
    };
  } catch (error) {
    subscription.remove();
    selectionSubscription.remove();
    throw error;
  }
}
