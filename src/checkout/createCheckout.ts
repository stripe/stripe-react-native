import type {
  Checkout,
  CheckoutController,
  CheckoutCurrencySelectorElement,
  CheckoutPaymentElement,
} from '../types/Checkout';
import type { StripeError } from '../types/Errors';
import { runServerUpdate } from './runServerUpdate';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
  createCheckoutBridgeId,
} from './CheckoutControllerEventEmitter';

const paymentElementIds = new WeakMap<CheckoutPaymentElement, string>();
const currencySelectorElementIds = new WeakMap<
  CheckoutCurrencySelectorElement,
  string
>();

/** Resolves a Currency Selector Element owned by a Checkout controller. */
export function getCheckoutCurrencySelectorElementId(
  element: CheckoutCurrencySelectorElement
): string {
  const id = currencySelectorElementIds.get(element);
  if (!id) {
    throw new Error('Currency Selector Element was not created by this SDK.');
  }
  return id;
}

/** Resolves a Payment Element owned by a Checkout controller. */
export function getCheckoutPaymentElementId(
  element: CheckoutPaymentElement
): string {
  const id = paymentElementIds.get(element);
  if (!id) {
    throw new Error('Payment Element was not created by this SDK.');
  }
  return id;
}

const controllerIds = new WeakMap<CheckoutController, string>();

/** Looks up a controller created by this bridge without exposing its native ID. */
export function getCheckoutControllerId(
  controller: CheckoutController
): string {
  const id = controllerIds.get(controller);
  if (!id) {
    throw new Error('Checkout controller was not created by this SDK.');
  }
  return id;
}

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

/** Preserves native error codes and wraps untyped bridge failures. */
export function normalizeCheckoutError(error: unknown): CheckoutOperationError {
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
  const controllerId = createCheckoutBridgeId();
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
    const performOperation = async <T>(
      operation: () => Promise<T>
    ): Promise<T> => {
      assertActive();
      try {
        const operationResult = await operation();
        assertActive();
        return operationResult;
      } catch (error) {
        throw normalizeCheckoutError(error);
      }
    };

    const paymentElement = {
      present: () =>
        performOperation(() =>
          NativeStripeSdk.presentCheckoutPaymentElement(controllerId)
        ),
    };
    const currencySelectorElement = result.isCurrencySelectorAvailable
      ? {}
      : null;

    const controller: CheckoutController = {
      get status() {
        return status;
      },
      get session() {
        return session!;
      },
      paymentElement,
      currencySelectorElement,
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
      confirm: () =>
        performOperation(() => NativeStripeSdk.confirmCheckout(controllerId)),
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
    controllerIds.set(controller, controllerId);
    paymentElementIds.set(paymentElement, controllerId);
    if (currencySelectorElement) {
      currencySelectorElementIds.set(currencySelectorElement, controllerId);
    }
    return controller;
  } catch (error) {
    subscription.remove();
    selectionSubscription.remove();
    throw error;
  }
}
