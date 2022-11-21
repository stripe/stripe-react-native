import { useCallback, useState } from 'react';
import type {
  NativePay,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
} from '../types';
import { useStripe } from './useStripe';

/**
 * useNativePay hook. Access all Apple and Google Pay functionality with this hook.
 */
export function useNativePay() {
  const {
    isNativePaySupported,
    confirmNativePaySetupIntent,
    confirmNativePayPayment,
    createNativePayPaymentMethod,
    dismissApplePay,
    updateApplePaySheet,
    canAddCardToWallet,
  } = useStripe();
  const [loading, setLoading] = useState(false);

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

      const result = await confirmNativePaySetupIntent(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmNativePaySetupIntent]
  );

  const _confirmNativePayPayment = useCallback(
    async (clientSecret: string, params: NativePay.ConfirmParams) => {
      setLoading(true);

      const result = await confirmNativePayPayment(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmNativePayPayment]
  );

  const _createNativePayPaymentMethod = useCallback(
    async (params: NativePay.PaymentMethodParams) => {
      setLoading(true);

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
