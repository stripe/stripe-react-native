import type { Checkout } from '../types/Checkout';

type NativeRowSelectionBehavior =
  | { type: 'default' }
  | { type: 'immediateAction' };

type NativePaymentElementConfiguration = Omit<
  Checkout.PaymentElementConfiguration,
  'rowSelectionBehavior'
> & {
  rowSelectionBehavior?: NativeRowSelectionBehavior;
};

export type NativeCheckoutCreateOptions = Omit<
  Checkout.CreateOptions,
  'paymentElement'
> & {
  paymentElement?: NativePaymentElementConfiguration;
};

export interface PreparedCheckoutConfiguration {
  options: NativeCheckoutCreateOptions;
  onSelectPaymentOption?: () => void;
}

/**
 * Removes the JavaScript callback from Checkout configuration before it crosses
 * the native bridge. The callback is registered against the native controller
 * separately after the controller receives its opaque identifier.
 */
export function prepareCheckoutConfiguration(
  options: Checkout.CreateOptions
): PreparedCheckoutConfiguration {
  const paymentElement = options.paymentElement;
  const rowSelectionBehavior = paymentElement?.rowSelectionBehavior;

  if (!paymentElement) {
    return { options };
  }

  const nativePaymentElement: NativePaymentElementConfiguration = {
    ...paymentElement,
    rowSelectionBehavior: rowSelectionBehavior
      ? { type: rowSelectionBehavior.type }
      : undefined,
  };

  return {
    options: {
      ...options,
      paymentElement: nativePaymentElement,
    },
    onSelectPaymentOption:
      rowSelectionBehavior?.type === 'immediateAction'
        ? rowSelectionBehavior.onSelectPaymentOption
        : undefined,
  };
}
