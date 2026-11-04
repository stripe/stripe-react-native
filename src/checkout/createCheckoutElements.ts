import { Platform } from 'react-native';
import type {
  ExpressCheckoutElement,
  CheckoutElements,
  CheckoutCurrencySelectorElement,
  CheckoutPaymentElement,
} from '../types/CheckoutElements';
import type { StripeError } from '../types/Errors';
import { runServerUpdate } from './runServerUpdate';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
  addCheckoutExpressCheckoutResultListener,
  createCheckoutBridgeId,
} from './CheckoutControllerEventEmitter';

const expressCheckoutElementIds = new WeakMap<ExpressCheckoutElement, string>();

/** Resolves an Express Checkout Element owned by a Checkout controller. */
export function getCheckoutExpressCheckoutElementId(
  element: ExpressCheckoutElement
): string {
  const id = expressCheckoutElementIds.get(element);
  if (!id) {
    throw new Error('Express Checkout Element was not created by this SDK.');
  }
  return id;
}

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

const CHECKOUT_DESTROYED_MESSAGE = 'This Checkout controller was destroyed.';

type CheckoutOperationError = Error & StripeError<CheckoutElements.ErrorCode>;

const checkoutErrorCodes = new Set<CheckoutElements.ErrorCode>([
  'Failed',
  'InvalidClientSecret',
  'SessionNotOpen',
  'SheetCurrentlyPresented',
  'Timeout',
  'Canceled',
]);

function checkoutError(
  code: CheckoutElements.ErrorCode,
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
  options: CheckoutElements.CreateOptions
): Parameters<typeof NativeStripeSdk.createCheckout>[0] {
  const { expressCheckoutElement, ...nativeOptions } = options;
  const result: Parameters<typeof NativeStripeSdk.createCheckout>[0] = {
    ...nativeOptions,
  };
  if (expressCheckoutElement) {
    result.expressCheckoutElement = {
      applePay: expressCheckoutElement.applePay,
      googlePay: expressCheckoutElement.googlePay,
      link: expressCheckoutElement.link,
      appearance: expressCheckoutElement.appearance,
    };
  }
  const rowSelectionBehavior = options.paymentElement?.rowSelectionBehavior;
  if (rowSelectionBehavior?.type === 'immediateAction') {
    return {
      ...result,
      paymentElement: {
        ...options.paymentElement,
        rowSelectionBehavior: { type: rowSelectionBehavior.type },
      },
    };
  }
  return result;
}

/**
 * Creates a controller for one Checkout Session. The caller owns the
 * controller lifecycle and must destroy it when it is no longer needed.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @internal
 * @CheckoutSessionPrivatePreview
 */
export async function createCheckoutElements(
  options: CheckoutElements.CreateOptions
): Promise<CheckoutElements> {
  return createCheckoutController(options);
}

/** Creates a controller and reports its native state changes to useCheckoutElements. */
export async function createCheckoutController(
  options: CheckoutElements.CreateOptions,
  onUpdate?: (controller: CheckoutElements) => void
): Promise<CheckoutElements> {
  if (options.expressCheckoutElement && Platform.OS !== 'ios') {
    throw new Error(
      'This version of @stripe/stripe-react-native does not include native support for Express Checkout Element.'
    );
  }
  const controllerId = createCheckoutBridgeId();
  let status: CheckoutElements['status'] = 'ready';
  let session: CheckoutElements.Session | undefined;
  let destroyPromise: Promise<void> | undefined;
  let controller: CheckoutElements | undefined;
  // Subscribe before creating native so initial updates cannot be lost.
  const subscription = addCheckoutControllerListener(controllerId, (update) => {
    if (status !== 'destroyed') {
      status = update.status;
      session = update.session;
      if (controller) {
        onUpdate?.(controller);
      }
    }
  });
  const selectionSubscription = addCheckoutControllerSelectionListener(
    controllerId,
    options.paymentElement?.rowSelectionBehavior?.type === 'immediateAction'
      ? options.paymentElement.rowSelectionBehavior.onSelectPaymentOption
      : undefined
  );
  const expressResultSubscription = addCheckoutExpressCheckoutResultListener(
    controllerId,
    options.expressCheckoutElement?.onResult
  );
  try {
    // Keep handle availability consistent if options change during native creation.
    const isShippingAddressElementConfigured = Boolean(
      options.shippingAddressElement
    );
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
    // Shipping collection is opt-in, matching the native Checkout configuration.
    const shippingAddressElement = isShippingAddressElementConfigured
      ? {
          present: () =>
            performOperation(() =>
              NativeStripeSdk.presentCheckoutShippingAddressElement(
                controllerId
              )
            ),
        }
      : null;
    const currencySelectorElement = result.isCurrencySelectorAvailable
      ? {}
      : null;

    const expressCheckoutElement = result.isExpressCheckoutAvailable
      ? {}
      : null;

    controller = {
      get status() {
        return status;
      },
      get session() {
        return session!;
      },
      paymentElement,
      shippingAddressElement,
      currencySelectorElement,
      expressCheckoutElement,
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
        expressResultSubscription.remove();
        if (expressCheckoutElement) {
          expressCheckoutElementIds.delete(expressCheckoutElement);
        }
        destroyPromise = Promise.resolve().then(() =>
          NativeStripeSdk.destroyCheckout(controllerId)
        );
        return destroyPromise;
      },
    };
    if (expressCheckoutElement) {
      expressCheckoutElementIds.set(expressCheckoutElement, controllerId);
    }
    paymentElementIds.set(paymentElement, controllerId);
    if (currencySelectorElement) {
      currencySelectorElementIds.set(currencySelectorElement, controllerId);
    }
    return controller;
  } catch (error) {
    subscription.remove();
    selectionSubscription.remove();
    expressResultSubscription.remove();
    throw error;
  }
}
