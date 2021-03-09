import type { ApplePay, ApplePayError, StripeError } from '../types';
import { useEffect, useState } from 'react';
import { useStripe } from './useStripe';
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);

export interface Props {
  /**
   *
   * @example
   * ```ts
   * const {} = useApplePay({
   *  onDidSetShippingMethodCallback: (shippingMethod, handler) => {
   *    handler([
   *      { label: 'Example item name 1', amount: '11.00' },
   *      { label: 'Example item name 2', amount: '25.00' },
   *   ]);
   *  }
   * })
   * ```
   */
  onDidSetShippingContactCallback?: (
    shippingMethod: ApplePay.ShippingMethod,
    handler: (
      summaryItems: ApplePay.CartSummaryItem[]
    ) => Promise<{
      error?: StripeError<ApplePayError>;
    }>
  ) => void;
  /**
   *
   * @example
   * ```ts
   * const {} = useApplePay({
   *  onDidSetShippingMethodCallback: (shippingContact, handler) => {
   *    handler([
   *      { label: 'Example item name 1', amount: '11.00' },
   *      { label: 'Example item name 2', amount: '25.00' },
   *   ]);
   *  }
   * })
   * ```
   */
  onDidSetShippingMethodCallback?: (
    shippingContact: ApplePay.ShippingContact,
    handler: (
      summaryItems: ApplePay.CartSummaryItem[]
    ) => Promise<{
      error?: StripeError<ApplePayError>;
    }>
  ) => void;
}

const SET_SHIPPING_METHOD_CALLBACK_NAME = 'onDidSetShippingMethod';
const SET_SHIPPING_CONTACT_CALLBACK_NAME = 'onDidSetShippingContact';

/**
 * useApplePay hook
 */
export function useApplePay({
  onDidSetShippingContactCallback,
  onDidSetShippingMethodCallback,
}: Props = {}) {
  const {
    isApplePaySupported,
    presentApplePay: presentApplePayNative,
    confirmApplePayPayment: confirmApplePayPaymentNative,
    updateApplePaySummaryItems,
  } = useStripe();
  const [items, setItems] = useState<ApplePay.CartSummaryItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    eventEmitter.addListener(
      SET_SHIPPING_METHOD_CALLBACK_NAME,
      onDidSetShippingMethod
    );
    eventEmitter.addListener(
      SET_SHIPPING_CONTACT_CALLBACK_NAME,
      onDidSetShippingContact
    );

    return () => {
      eventEmitter.removeListener(
        SET_SHIPPING_METHOD_CALLBACK_NAME,
        onDidSetShippingMethod
      );
      eventEmitter.removeListener(
        SET_SHIPPING_CONTACT_CALLBACK_NAME,
        onDidSetShippingMethod
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDidSetShippingMethod = (shippingMethod: any) => {
    if (onDidSetShippingMethodCallback) {
      onDidSetShippingMethodCallback(
        shippingMethod,
        updateApplePaySummaryItems
      );
    } else {
      updateApplePaySummaryItems(items as ApplePay.CartSummaryItem[]);
    }
  };

  const onDidSetShippingContact = (shippingContact: any) => {
    if (onDidSetShippingContactCallback) {
      onDidSetShippingContactCallback(
        shippingContact,
        updateApplePaySummaryItems
      );
    } else {
      updateApplePaySummaryItems(items as ApplePay.CartSummaryItem[]);
    }
  };

  const presentApplePay = async (params: ApplePay.PresentParams) => {
    setLoading(true);
    setItems(params.cartItems);
    const result = await presentApplePayNative(params);
    if (result.error) {
      setItems(null);
    }
    setLoading(false);
    return result;
  };

  const confirmApplePayPayment = async (clientSecret: string) => {
    setLoading(true);
    const result = await confirmApplePayPaymentNative(clientSecret);
    setItems(null);
    setLoading(false);
    return result;
  };

  return {
    loading,
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  };
}
