import type { ApplePay, ApplePayError, StripeError } from '../types';
import { useCallback, useEffect, useState } from 'react';
import { useStripe } from './useStripe';
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);

export interface Props {
  /**
   *
   * @example
   * ```ts
   * const { presentApplePay } = useApplePay({
   *  onShippingMethodSelected: (shippingMethod, handler) => {
   *    handler([
   *      { label: 'Example item name 1', amount: '11.00' },
   *      { label: 'Example item name 2', amount: '25.00' },
   *   ]);
   *  }
   * })
   * ```
   */
  onShippingMethodSelected?: (
    shippingMethod: ApplePay.ShippingMethod,
    handler: (summaryItems: ApplePay.CartSummaryItem[]) => Promise<{
      error?: StripeError<ApplePayError>;
    }>
  ) => void;
  /**
   *
   * @example
   * ```ts
   * const { presentApplePay } = useApplePay({
   *  onShippingContactSelected: (shippingContact, handler) => {
   *    handler([
   *      { label: 'Example item name 1', amount: '11.00' },
   *      { label: 'Example item name 2', amount: '25.00' },
   *    ], [
   *      { field: 'city', message: 'city error' },
   *    ]);
   *  }
   * })
   * ```
   */
  onShippingContactSelected?: (
    shippingContact: ApplePay.ShippingContact,
    handler: (
      summaryItems: ApplePay.CartSummaryItem[],
      errorAddressFields?: Array<{
        field: ApplePay.AddressFields;
        message?: string;
      }>
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
  onShippingMethodSelected,
  onShippingContactSelected,
}: Props = {}) {
  const {
    isApplePaySupported,
    presentApplePay: _presentApplePay,
    confirmApplePayPayment: _confirmApplePayPayment,
    updateApplePaySummaryItems,
    openApplePaySetup: _openApplePaySetup,
  } = useStripe();
  const [items, setItems] = useState<ApplePay.CartSummaryItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const onDidSetShippingMethod = useCallback(
    (result: { shippingMethod: ApplePay.ShippingMethod }) => {
      if (onShippingMethodSelected) {
        onShippingMethodSelected(
          result.shippingMethod,
          updateApplePaySummaryItems
        );
      } else {
        updateApplePaySummaryItems(items as ApplePay.CartSummaryItem[]);
      }
    },
    [items, onShippingMethodSelected, updateApplePaySummaryItems]
  );

  const onDidSetShippingContact = useCallback(
    (result: { shippingContact: ApplePay.ShippingContact }) => {
      if (onShippingContactSelected) {
        onShippingContactSelected(
          result.shippingContact,
          updateApplePaySummaryItems
        );
      } else {
        updateApplePaySummaryItems(items as ApplePay.CartSummaryItem[]);
      }
    },
    [items, onShippingContactSelected, updateApplePaySummaryItems]
  );

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
        onDidSetShippingContact
      );
    };
  }, [onDidSetShippingContact, onDidSetShippingMethod]);

  const presentApplePay = useCallback(
    async (params: ApplePay.PresentParams) => {
      setLoading(true);
      setItems(params.cartItems);
      const result = await _presentApplePay(params);
      if (result.error) {
        setItems(null);
      }
      setLoading(false);
      return result;
    },
    [_presentApplePay]
  );

  const openApplePaySetup = useCallback(async () => {
    setLoading(true);
    const result = await _openApplePaySetup();
    setLoading(false);
    return result;
  }, [_openApplePaySetup]);

  const confirmApplePayPayment = useCallback(
    async (clientSecret: string) => {
      setLoading(true);
      const result = await _confirmApplePayPayment(clientSecret);
      setItems(null);
      setLoading(false);
      return result;
    },
    [_confirmApplePayPayment]
  );

  return {
    loading,
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
    openApplePaySetup,
  };
}
