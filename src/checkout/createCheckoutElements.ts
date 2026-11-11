import type {
  CheckoutElements,
  CheckoutCurrencySelectorElement,
  CheckoutPaymentElement,
  ExpressCheckoutElement,
} from '../types/CheckoutElements';
import type { StripeError } from '../types/Errors';
import { runServerUpdate } from './runServerUpdate';
import NativeStripeSdk, {
  type CheckoutCreateOptions,
} from '../specs/NativeStripeSdkModule';
import { Platform } from 'react-native';
import {
  addCheckoutControllerListener,
  addCheckoutControllerSelectionListener,
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
): CheckoutCreateOptions {
  const { expressCheckoutElement, ...rest } = options;
  const nativeOptions: CheckoutCreateOptions = { ...rest };
  if (expressCheckoutElement) {
    // Payment callbacks stay in JS; only data crosses the native bridge.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onResult: _onResult, ...configuration } = expressCheckoutElement;
    nativeOptions.expressCheckoutElement = configuration;
  }
  const rowSelectionBehavior = options.paymentElement?.rowSelectionBehavior;
  if (rowSelectionBehavior && rowSelectionBehavior.type !== 'default') {
    nativeOptions.paymentElement = {
      ...options.paymentElement,
      rowSelectionBehavior: { type: rowSelectionBehavior.type },
    };
  }
  return nativeOptions;
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
  if (
    options.expressCheckoutElement &&
    Platform.OS !== 'android' &&
    Platform.OS !== 'ios'
  ) {
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
    const invokeIfActive = async <T>(
      operation: () => Promise<T>
    ): Promise<T> => {
      assertActive();
      try {
        return await operation();
      } catch (error) {
        throw normalizeCheckoutError(error);
      }
    };
    const performOperation = async <T>(
      operation: () => Promise<T>
    ): Promise<T> => {
      const operationResult = await invokeIfActive(operation);
      assertActive();
      return operationResult;
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
        invokeIfActive(() => NativeStripeSdk.confirmCheckout(controllerId)),
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
    paymentElementIds.set(paymentElement, controllerId);
    if (currencySelectorElement) {
      currencySelectorElementIds.set(currencySelectorElement, controllerId);
    }
    if (expressCheckoutElement) {
      expressCheckoutElementIds.set(expressCheckoutElement, controllerId);
    }
    return controller;
  } catch (error) {
    subscription.remove();
    selectionSubscription.remove();
    throw error;
  }
}
