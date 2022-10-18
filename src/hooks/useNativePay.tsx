import { useCallback, useState, useEffect } from 'react';
import type {
  NativePay,
  StripeError,
  NativePayError,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
} from '../types';
import { useStripe } from './useStripe';

/** All the props for the `useNativePay` hook are callback functions for Apple Pay. These allow you to take action based on customer's interactions with the Apple Pay sheet, and update the sheet accordingly with the `handler` function (which maps to the updateApplePaySheet function). */
export type Props = {
  /**
   * Pass this callback function to update the Apple Pay sheet after the customer selects a shipping method.
   * @example
   * ```ts
   * const { ... } = useNativePay({
   *  onApplePayShippingMethodSelected: (shippingMethod, handler) => {
   *    handler(newCartItems, shippingMethods, anyErrors);
   *  }
   * })
   * ```
   */
  onApplePayShippingMethodSelected?: (
    shippingMethod: NativePay.ShippingMethod,
    handler: (
      summaryItems: Array<NativePay.CartSummaryItem>,
      shippingMethods: Array<NativePay.ShippingMethod>,
      errors: Array<NativePay.ApplePaySheetError>
    ) => Promise<{
      error?: StripeError<NativePayError>;
    }>
  ) => void;
  /**
   * Pass this callback function to update the Apple Pay sheet after the customer edits their contact.
   * @example
   * ```ts
   * const { ... } = useNativePay({
   *  onApplePayShippingContactSelected: (contact, handler) => {
   *    handler(newCartItems, shippingMethods, anyErrors);
   *  }
   * })
   * ```
   */
  onApplePayShippingContactSelected?: (
    shippingContact: NativePay.ShippingContact,
    handler: (
      summaryItems: Array<NativePay.CartSummaryItem>,
      shippingMethods: Array<NativePay.ShippingMethod>,
      errors: Array<NativePay.ApplePaySheetError>
    ) => Promise<{
      error?: StripeError<NativePayError>;
    }>
  ) => void;
  /**
   * Pass this callback function to update the Apple Pay sheet (including pricing) after the customer inputs a coupon code.
   * @example
   * ```ts
   * const { ... } = useNativePay({
   *  onApplePayCouponCodeEntered: (couponCode, handler) => {
   *    if (isValid(couponCode)) {
   *       handler(newCartItems, shippingMethods, []);
   *    } else {
   *       handler(newCartItems, shippingMethods, [badCouponError]);
   *    }
   *  }
   * })
   * ```
   */
  onApplePayCouponCodeEntered?: (
    couponCode: string,
    handler: (
      summaryItems: Array<NativePay.CartSummaryItem>,
      shippingMethods: Array<NativePay.ShippingMethod>,
      errors: Array<NativePay.ApplePaySheetError>
    ) => Promise<{
      error?: StripeError<NativePayError>;
    }>
  ) => void;
};

/**
 * useNativePay hook. Access all Apple and Google Pay functionality with this hook.
 */
export function useNativePay({
  onApplePayShippingMethodSelected,
  onApplePayShippingContactSelected,
  onApplePayCouponCodeEntered,
}: Props = {}) {
  const {
    isNativePaySupported,
    confirmNativePaySetupIntent,
    confirmNativePayPayment,
    createNativePayPaymentMethod,
    dismissApplePay,
    updateApplePaySheet,
    addOnApplePayShippingMethodSelectedListener,
    addOnApplePayCouponCodeEnteredListener,
    addOnApplePayShippingContactSelectedListener,
    canAddCardToWallet,
  } = useStripe();
  const [summaryItems, setSummaryItems] = useState<NativePay.CartSummaryItem[]>(
    []
  );
  const [shippingMethods, setShippingMethods] = useState<
    NativePay.ShippingMethod[]
  >([]);
  const [errors, setErrors] = useState<NativePay.ApplePaySheetError[]>([]);
  const [loading, setLoading] = useState(false);

  const onDidSetShippingMethod = useCallback(
    (event: { shippingMethod: NativePay.ShippingMethod }) => {
      if (onApplePayShippingMethodSelected) {
        onApplePayShippingMethodSelected(
          event.shippingMethod,
          updateApplePaySheet
        );
      } else {
        updateApplePaySheet(summaryItems, shippingMethods, errors);
      }
    },
    [
      summaryItems,
      shippingMethods,
      errors,
      onApplePayShippingMethodSelected,
      updateApplePaySheet,
    ]
  );

  const onDidSetShippingContact = useCallback(
    (event: { shippingContact: NativePay.ShippingContact }) => {
      if (onApplePayShippingContactSelected) {
        onApplePayShippingContactSelected(
          event.shippingContact,
          updateApplePaySheet
        );
      } else {
        updateApplePaySheet(summaryItems, shippingMethods, errors);
      }
    },
    [
      summaryItems,
      shippingMethods,
      errors,
      onApplePayShippingContactSelected,
      updateApplePaySheet,
    ]
  );

  const onDidSetCouponCode = useCallback(
    (event: { couponCode: string }) => {
      if (onApplePayCouponCodeEntered) {
        onApplePayCouponCodeEntered(event.couponCode, updateApplePaySheet);
      } else {
        updateApplePaySheet(summaryItems, shippingMethods, errors);
      }
    },
    [
      summaryItems,
      shippingMethods,
      errors,
      onApplePayCouponCodeEntered,
      updateApplePaySheet,
    ]
  );

  useEffect(() => {
    const didSetShippingMethodListener =
      addOnApplePayShippingMethodSelectedListener(onDidSetShippingMethod);
    const didSetShippingContactListener =
      addOnApplePayShippingContactSelectedListener(onDidSetShippingContact);
    const didSetCouponCodeListener =
      addOnApplePayCouponCodeEnteredListener(onDidSetCouponCode);

    return () => {
      didSetShippingMethodListener.remove();
      didSetShippingContactListener.remove();
      didSetCouponCodeListener.remove();
    };
  }, [
    onDidSetShippingMethod,
    addOnApplePayShippingMethodSelectedListener,
    onDidSetShippingContact,
    addOnApplePayShippingContactSelectedListener,
    onDidSetCouponCode,
    addOnApplePayCouponCodeEnteredListener,
  ]);

  const _isNativePaySupported = useCallback(
    async (params?: { googlePay?: NativePay.IsGooglePaySupportedParams }) => {
      setLoading(true);

      const result = await isNativePaySupported(params);
      setLoading(false);

      return result;
    },
    [isNativePaySupported]
  );

  const _confirmNativePaySetupIntent = useCallback(
    async (clientSecret: string, params: NativePay.ConfirmParams) => {
      setLoading(true);
      setSummaryItems(params.applePay?.cartItems ?? []);
      setShippingMethods(params.applePay?.shippingMethods ?? []);
      setErrors([]);

      const result = await confirmNativePaySetupIntent(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmNativePaySetupIntent]
  );

  const _confirmNativePayPayment = useCallback(
    async (clientSecret: string, params: NativePay.ConfirmParams) => {
      setLoading(true);
      setSummaryItems(params.applePay?.cartItems ?? []);
      setShippingMethods(params.applePay?.shippingMethods ?? []);
      setErrors([]);

      const result = await confirmNativePayPayment(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmNativePayPayment]
  );

  const _createNativePayPaymentMethod = useCallback(
    async (params: NativePay.PaymentMethodParams) => {
      setLoading(true);
      setSummaryItems(params.applePay?.cartItems ?? []);
      setShippingMethods(params.applePay?.shippingMethods ?? []);
      setErrors([]);

      const result = await createNativePayPaymentMethod(params);
      setLoading(false);

      return result;
    },
    [createNativePayPaymentMethod]
  );

  const _dismissApplePay = useCallback(async () => {
    setLoading(true);

    const result = await dismissApplePay();
    setLoading(false);

    return result;
  }, [dismissApplePay]);

  const _updateApplePaySheet = useCallback(
    async (
      scopedSummaryItems: Array<NativePay.CartSummaryItem>,
      scopedShippingMethods: Array<NativePay.ShippingMethod>,
      scopedErrors: Array<NativePay.ApplePaySheetError>
    ) => {
      setLoading(true);
      setSummaryItems(scopedSummaryItems);
      setShippingMethods(scopedShippingMethods);
      setErrors(scopedErrors);

      const result = await updateApplePaySheet(
        scopedSummaryItems,
        scopedShippingMethods,
        scopedErrors
      );
      setLoading(false);

      return result;
    },
    [updateApplePaySheet]
  );

  const _canAddCardToWallet = useCallback(
    async (
      params: CanAddCardToWalletParams
    ): Promise<CanAddCardToWalletResult> => {
      setLoading(true);

      const result = await canAddCardToWallet(params);
      setLoading(false);

      return result;
    },
    [canAddCardToWallet]
  );

  return {
    /** Use this boolean to present a spinner or other similar loading screen. `true` if the SDK is currently processing, `false` if it is not. */
    loading,
    /**
     * Check if the relevant native wallet (Apple Pay on iOS, Google Pay on Android) is supported.
     * @returns A boolean indicating whether or not the native wallet is supported.
     */
    isNativePaySupported: _isNativePaySupported,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [SetupIntent](https://stripe.com/docs/api/setup_intents).
     * @param clientSecret The client secret of the SetupIntent.
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `setupIntent` and `paymentMethod` fields.
     */
    confirmNativePaySetupIntent: _confirmNativePaySetupIntent,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [PaymentIntent](https://stripe.com/docs/api/payment_intents).
     * @param clientSecret The client secret of the PaymentIntent.
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `paymentIntent` and `paymentMethod` fields.
     */
    confirmNativePayPayment: _confirmNativePayPayment,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to create a Stripe [PaymentMethod](https://stripe.com/docs/api/payment_methods) and [token](https://stripe.com/docs/api/tokens).
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `paymentMethod` and `token` fields.
     */
    createNativePayPaymentMethod: _createNativePayPaymentMethod,
    /**
     * Dismiss the Apple Pay sheet if it is open. iOS only, this is a no-op on Android.
     * @returns A boolean indicating whether or not the sheet was successfully closed. Will return false if the Apple Pay sheet was not open.
     */
    dismissApplePay: _dismissApplePay,
    /**
     * Update different items on the Apple Pay sheet, including the summary items, the shipping methods, and any errors shown. iOS only, this is a no-op on Android.
     * @param summaryItems An array of payment summary items to display in the Apple Pay sheet.
     * @param shippingMethods An array of shipping methods to display in the Apple Pay sheet.
     * @param errors An array of errors associated with the user's input that must be corrected to proceed with payment. These errors will be shown in the Apple Pay sheet.
     *
     * @returns An object with an optional 'error' field, which is only populated if something went wrong.
     */
    updateApplePaySheet: _updateApplePaySheet,
    /**
     * Check if the app & device support adding this card to the native wallet.
     * @param params An object containing fields for `primaryAccountIdentifier`, `cardLastFour`, and `testEnv`.
     *
     * @returns A promise resolving to an object of type CanAddCardToWalletResult. Check the `canAddCard` field, if it's true, you should show the `<AddToWalletButton />`
     */
    canAddCardToWallet: _canAddCardToWallet,
  };
}
