import type { Checkout, CheckoutController } from '../types/Checkout';
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
  _options: Checkout.CreateOptions
): Promise<CheckoutController> {
  const options = _options;
  const result = await NativeStripeSdk.createCheckout(
    nativeCreateOptions(options)
  );
  const controllerId = toCheckoutControllerId(result.controllerId);
  let status: CheckoutController['status'] = 'ready';
  let session = result.session;
  let destroyed = false;
  let destroyPromise: Promise<void> | undefined;

  const assertActive = () => {
    if (destroyed) {
      throw new Error(CHECKOUT_DESTROYED_MESSAGE);
    }
  };
  const notImplemented = async (): Promise<never> => {
    assertActive();
    throw new Error(CHECKOUT_NOT_IMPLEMENTED_MESSAGE);
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
