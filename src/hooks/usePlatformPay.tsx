import { useCallback, useState } from 'react';
import type {
  PlatformPay,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
} from '../types';
import { useStripe } from './useStripe';

/**
 * usePlatformPay hook. Access all Apple and Google Pay functionality with this hook.
 */
export function usePlatformPay() {
  const {
    isPlatformPaySupported,
    confirmPlatformPaySetupIntent,
    confirmPlatformPayPayment,
    createPlatformPayPaymentMethod,
    createPlatformPayToken,
    dismissPlatformPay,
    updatePlatformPaySheet,
    canAddCardToWallet,
    openPlatformPaySetup,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  const _isPlatformPaySupported = useCallback(
    async (params?: { googlePay?: PlatformPay.IsGooglePaySupportedParams }) => {
      setLoading(true);

      const result = await isPlatformPaySupported(params);
      setLoading(false);

      return result;
    },
    [isPlatformPaySupported]
  );

  const _confirmPlatformPaySetupIntent = useCallback(
    async (clientSecret: string, params: PlatformPay.ConfirmParams) => {
      setLoading(true);

      const result = await confirmPlatformPaySetupIntent(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmPlatformPaySetupIntent]
  );

  const _confirmPlatformPayPayment = useCallback(
    async (clientSecret: string, params: PlatformPay.ConfirmParams) => {
      setLoading(true);

      const result = await confirmPlatformPayPayment(clientSecret, params);
      setLoading(false);

      return result;
    },
    [confirmPlatformPayPayment]
  );

  const _createPlatformPayPaymentMethod = useCallback(
    async (params: PlatformPay.PaymentMethodParams) => {
      setLoading(true);

      const result = await createPlatformPayPaymentMethod(params);
      setLoading(false);

      return result;
    },
    [createPlatformPayPaymentMethod]
  );

  const _createPlatformPayToken = useCallback(
    async (params: PlatformPay.PaymentMethodParams) => {
      setLoading(true);

      const result = await createPlatformPayToken(params);
      setLoading(false);

      return result;
    },
    [createPlatformPayToken]
  );

  const _dismissPlatformPay = useCallback(async () => {
    setLoading(true);

    const result = await dismissPlatformPay();
    setLoading(false);

    return result;
  }, [dismissPlatformPay]);

  const _updatePlatformPaySheet = useCallback(
    async (params: {
      applePay: {
        cartItems: Array<PlatformPay.CartSummaryItem>;
        shippingMethods: Array<PlatformPay.ShippingMethod>;
        errors: Array<PlatformPay.ApplePaySheetError>;
      };
    }) => {
      setLoading(true);

      const result = await updatePlatformPaySheet(params);
      setLoading(false);

      return result;
    },
    [updatePlatformPaySheet]
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

  const _openPlatformPaySetup = useCallback(async (): Promise<void> => {
    return openPlatformPaySetup();
  }, [openPlatformPaySetup]);

  return {
    /** Use this boolean to present a spinner or other similar loading screen. `true` if the SDK is currently processing, `false` if it is not. */
    loading,
    /**
     * Check if the relevant native wallet (Apple Pay on iOS, Google Pay on Android) is supported.
     * @returns A boolean indicating whether or not the native wallet is supported.
     */
    isPlatformPaySupported: _isPlatformPaySupported,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [SetupIntent](https://stripe.com/docs/api/setup_intents).
     * @param clientSecret The client secret of the SetupIntent.
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `setupIntent` and `paymentMethod` fields.
     */
    confirmPlatformPaySetupIntent: _confirmPlatformPaySetupIntent,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to confirm a Stripe [PaymentIntent](https://stripe.com/docs/api/payment_intents).
     * @param clientSecret The client secret of the PaymentIntent.
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `paymentIntent` and `paymentMethod` fields.
     */
    confirmPlatformPayPayment: _confirmPlatformPayPayment,
    /**
     * Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to create a Stripe [PaymentMethod](https://stripe.com/docs/api/payment_methods) and [token](https://stripe.com/docs/api/tokens).
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with both `paymentMethod` and `token` fields.
     */
    createPlatformPayPaymentMethod: _createPlatformPayPaymentMethod,
    /**
     * @deprecated The Tokens API is deprecated, you should use Payment Methods and `createPlatformPayPaymentMethod` instead.  Launches the relevant native wallet sheet (Apple Pay on iOS, Google Pay on Android) in order to create a Stripe [token](https://stripe.com/docs/api/tokens).
     * @param params an object describing the Apple Pay and Google Pay configurations.
     * @returns An object with an error field if something went wrong or the flow was cancelled, otherwise an object with a `token` field.
     */
    createPlatformPayToken: _createPlatformPayToken,
    /**
     * Dismiss the Apple Pay sheet if it is open. iOS only, this is a no-op on Android.
     * @returns A boolean indicating whether or not the sheet was successfully closed. Will return false if the Apple Pay sheet was not open.
     */
    dismissPlatformPay: _dismissPlatformPay,
    /**
     * Update different items on the Apple Pay sheet, including the summary items, the shipping methods, and any errors shown. iOS only, this is a no-op on Android.
     * @param cartItems An array of payment summary items to display in the Apple Pay sheet.
     * @param shippingMethods An array of shipping methods to display in the Apple Pay sheet.
     * @param errors An array of errors associated with the user's input that must be corrected to proceed with payment. These errors will be shown in the Apple Pay sheet.
     *
     * @returns An object with an optional 'error' field, which is only populated if something went wrong.
     */
    updatePlatformPaySheet: _updatePlatformPaySheet,
    /**
     * Check if the app & device support adding this card to the native wallet.
     * @param params An object containing fields for `primaryAccountIdentifier`, `cardLastFour`, and `testEnv`.
     *
     * @returns A promise resolving to an object of type CanAddCardToWalletResult. Check the `canAddCard` field, if it's true, you should show the `<AddToWalletButton />`
     */
    canAddCardToWallet: _canAddCardToWallet,
    /**
     * iOS only, this is a no-op on Android. Use this method to move users to the interface for adding credit cards.
     * This method transfers control to the Wallet app on iPhone or to the Settings
     * app on iPad. For devices that don’t support Apple Pay, this method does nothing.
     */
    openPlatformPaySetup: _openPlatformPaySetup,
  };
}
