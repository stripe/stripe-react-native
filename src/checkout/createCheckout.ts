import type { Checkout, CheckoutController } from '../types/Checkout';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
  createCheckoutId,
} from './CheckoutControllerEventEmitter';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';
const CHECKOUT_DESTROYED_MESSAGE = 'This Checkout controller was destroyed.';

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
      if (status === 'destroyed') {
        subscription.remove();
        selectionSubscription.remove();
      }
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
        throw new Error(CHECKOUT_DESTROYED_MESSAGE);
      }
    };
    const notImplemented = async (): Promise<never> => {
      assertActive();
      throw new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
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
      // TODO(porter): Bridge standard Checkout mutations.
      updateEmail: notImplemented,
      updateShippingAddress: notImplemented,
      applyPromotionCode: notImplemented,
      removePromotionCode: notImplemented,
      // TODO(porter): Bridge the Checkout server-update handshake.
      runServerUpdate: notImplemented,
      clearPaymentOption: notImplemented,
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
