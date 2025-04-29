import type {
  PaymentMethod,
  PaymentIntent,
  PaymentSheet,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  ConfirmPaymentResult,
  HandleNextActionResult,
  HandleNextActionForSetupResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  StripeError,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  SetupIntent,
  CreateTokenResult,
  Token,
  VerifyMicrodepositsParams,
  VerifyMicrodepositsForPaymentResult,
  VerifyMicrodepositsForSetupResult,
  CollectBankAccountForSetupResult,
  CollectBankAccountForPaymentResult,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  FinancialConnections,
  PlatformPay,
  PlatformPayError,
} from '../types';
import { useCallback } from 'react';
import {
  confirmPayment,
  createPaymentMethod,
  retrievePaymentIntent,
  retrieveSetupIntent,
  confirmSetupIntent,
  createTokenForCVCUpdate,
  handleNextAction,
  handleNextActionForSetup,
  handleURLCallback,
  initPaymentSheet,
  presentPaymentSheet,
  confirmPaymentSheetPayment,
  createToken,
  collectBankAccountForPayment,
  collectBankAccountForSetup,
  verifyMicrodepositsForPayment,
  verifyMicrodepositsForSetup,
  canAddCardToWallet,
  collectBankAccountToken,
  collectFinancialConnectionsAccounts,
  resetPaymentSheetCustomer,
  isPlatformPaySupported,
  confirmPlatformPaySetupIntent,
  confirmPlatformPayPayment,
  dismissPlatformPay,
  createPlatformPayPaymentMethod,
  createPlatformPayToken,
  updatePlatformPaySheet,
  openPlatformPaySetup,
} from '../functions';
import type { CollectBankAccountTokenParams } from '../types/PaymentMethod';
import type { CollectFinancialConnectionsAccountsParams } from '../types/FinancialConnections';

/**
 * useStripe hook
 */
export function useStripe() {
  const _createPaymentMethod = useCallback(
    async (
      data: PaymentMethod.CreateParams,
      options: PaymentMethod.CreateOptions = {}
    ): Promise<CreatePaymentMethodResult> => {
      return createPaymentMethod(data, options);
    },
    []
  );

  const _createToken = useCallback(
    async (params: Token.CreateParams): Promise<CreateTokenResult> => {
      return createToken(params);
    },
    []
  );

  const _retrievePaymentIntent = useCallback(
    async (clientSecret: string): Promise<RetrievePaymentIntentResult> => {
      return retrievePaymentIntent(clientSecret);
    },
    []
  );

  const _retrieveSetupIntent = useCallback(
    async (clientSecret: string): Promise<RetrieveSetupIntentResult> => {
      return retrieveSetupIntent(clientSecret);
    },
    []
  );

  const _confirmPayment = useCallback(
    async (
      paymentIntentClientSecret: string,
      data?: PaymentIntent.ConfirmParams,
      options: PaymentIntent.ConfirmOptions = {}
    ): Promise<ConfirmPaymentResult> => {
      return confirmPayment(paymentIntentClientSecret, data, options);
    },
    []
  );

  const _handleNextAction = useCallback(
    async (
      paymentIntentClientSecret: string,
      returnURL?: string
    ): Promise<HandleNextActionResult> => {
      return handleNextAction(paymentIntentClientSecret, returnURL);
    },
    []
  );

  const _handleNextActionForSetup = useCallback(
    async (
      setupIntentClientSecret: string,
      returnURL?: string
    ): Promise<HandleNextActionForSetupResult> => {
      return handleNextActionForSetup(setupIntentClientSecret, returnURL);
    },
    []
  );

  const _confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: SetupIntent.ConfirmParams,
      options: SetupIntent.ConfirmOptions = {}
    ): Promise<ConfirmSetupIntentResult> => {
      return confirmSetupIntent(paymentIntentClientSecret, data, options);
    },
    []
  );

  const _createTokenForCVCUpdate = useCallback(
    async (cvc: string): Promise<CreateTokenForCVCUpdateResult> => {
      return createTokenForCVCUpdate(cvc);
    },
    []
  );

  const _initPaymentSheet = useCallback(
    async (
      params: PaymentSheet.SetupParams
    ): Promise<InitPaymentSheetResult> => {
      return initPaymentSheet(params);
    },
    []
  );

  const _presentPaymentSheet = useCallback(
    async (
      options?: PaymentSheet.PresentOptions
    ): Promise<PresentPaymentSheetResult> => {
      return presentPaymentSheet(options);
    },
    []
  );

  const _confirmPaymentSheetPayment =
    useCallback(async (): Promise<ConfirmPaymentSheetPaymentResult> => {
      return confirmPaymentSheetPayment();
    }, []);

  const _handleURLCallback = useCallback(
    async (url: string): Promise<boolean> => {
      return handleURLCallback(url);
    },
    []
  );

  const _collectBankAccountForPayment = useCallback(
    async (
      clientSecret: string,
      params: PaymentMethod.CollectBankAccountParams
    ): Promise<CollectBankAccountForPaymentResult> => {
      return collectBankAccountForPayment(clientSecret, params);
    },
    []
  );

  const _collectBankAccountForSetup = useCallback(
    async (
      clientSecret: string,
      params: PaymentMethod.CollectBankAccountParams
    ): Promise<CollectBankAccountForSetupResult> => {
      return collectBankAccountForSetup(clientSecret, params);
    },
    []
  );

  const _verifyMicrodepositsForPayment = useCallback(
    async (
      clientSecret: string,
      params: VerifyMicrodepositsParams
    ): Promise<VerifyMicrodepositsForPaymentResult> => {
      return verifyMicrodepositsForPayment(clientSecret, params);
    },
    []
  );

  const _verifyMicrodepositsForSetup = useCallback(
    async (
      clientSecret: string,
      params: VerifyMicrodepositsParams
    ): Promise<VerifyMicrodepositsForSetupResult> => {
      return verifyMicrodepositsForSetup(clientSecret, params);
    },
    []
  );

  const _canAddCardToWallet = useCallback(
    async (
      params: CanAddCardToWalletParams
    ): Promise<CanAddCardToWalletResult> => {
      return canAddCardToWallet(params);
    },
    []
  );

  const _collectBankAccountToken = useCallback(
    async (
      clientSecret: string,
      params?: CollectBankAccountTokenParams
    ): Promise<FinancialConnections.TokenResult> => {
      return collectBankAccountToken(clientSecret, params);
    },
    []
  );

  const _collectFinancialConnectionsAccounts = useCallback(
    async (
      clientSecret: string,
      params?: CollectFinancialConnectionsAccountsParams
    ): Promise<FinancialConnections.SessionResult> => {
      return collectFinancialConnectionsAccounts(clientSecret, params);
    },
    []
  );

  const _resetPaymentSheetCustomer = useCallback(async (): Promise<null> => {
    return resetPaymentSheetCustomer();
  }, []);

  const _isPlatformPaySupported = useCallback(
    async (params?: {
      googlePay?: PlatformPay.IsGooglePaySupportedParams;
    }): Promise<boolean> => {
      return isPlatformPaySupported(params);
    },
    []
  );

  const _confirmPlatformPaySetupIntent = useCallback(
    async (
      clientSecret: string,
      params: PlatformPay.ConfirmParams
    ): Promise<PlatformPay.ConfirmSetupIntentResult> => {
      return confirmPlatformPaySetupIntent(clientSecret, params);
    },
    []
  );

  const _confirmPlatformPayPayment = useCallback(
    async (
      clientSecret: string,
      params: PlatformPay.ConfirmParams
    ): Promise<PlatformPay.ConfirmPaymentResult> => {
      return confirmPlatformPayPayment(clientSecret, params);
    },
    []
  );

  const _dismissPlatformPay = useCallback(async (): Promise<boolean> => {
    return dismissPlatformPay();
  }, []);

  const _createPlatformPayPaymentMethod = useCallback(
    async (
      params: PlatformPay.PaymentMethodParams
    ): Promise<PlatformPay.PaymentMethodResult> => {
      return createPlatformPayPaymentMethod(params);
    },
    []
  );

  const _createPlatformPayToken = useCallback(
    async (
      params: PlatformPay.PaymentMethodParams
    ): Promise<PlatformPay.TokenResult> => {
      return createPlatformPayToken(params);
    },
    []
  );

  const _updatePlatformPaySheet = useCallback(
    async (params: {
      applePay: {
        cartItems: Array<PlatformPay.CartSummaryItem>;
        shippingMethods: Array<PlatformPay.ShippingMethod>;
        errors: Array<PlatformPay.ApplePaySheetError>;
      };
    }): Promise<{
      error?: StripeError<PlatformPayError>;
    }> => {
      return updatePlatformPaySheet(params);
    },
    []
  );

  const _openPlatformPaySetup = useCallback(async (): Promise<void> => {
    return openPlatformPaySetup();
  }, []);

  return {
    retrievePaymentIntent: _retrievePaymentIntent,
    retrieveSetupIntent: _retrieveSetupIntent,
    confirmPayment: _confirmPayment,
    createPaymentMethod: _createPaymentMethod,
    handleNextAction: _handleNextAction,
    handleNextActionForSetup: _handleNextActionForSetup,
    confirmSetupIntent: _confirmSetupIntent,
    createTokenForCVCUpdate: _createTokenForCVCUpdate,
    handleURLCallback: _handleURLCallback,
    confirmPaymentSheetPayment: _confirmPaymentSheetPayment,
    presentPaymentSheet: _presentPaymentSheet,
    initPaymentSheet: _initPaymentSheet,
    createToken: _createToken,
    collectBankAccountForPayment: _collectBankAccountForPayment,
    collectBankAccountForSetup: _collectBankAccountForSetup,
    verifyMicrodepositsForPayment: _verifyMicrodepositsForPayment,
    verifyMicrodepositsForSetup: _verifyMicrodepositsForSetup,
    canAddCardToWallet: _canAddCardToWallet,
    collectBankAccountToken: _collectBankAccountToken,
    collectFinancialConnectionsAccounts: _collectFinancialConnectionsAccounts,
    /**
     * You must call this method when the user logs out from your app. This will ensure that
     * any persisted authentication state in the PaymentSheet, such as authentication cookies,
     * is also cleared during logout.
     */
    resetPaymentSheetCustomer: _resetPaymentSheetCustomer,
    isPlatformPaySupported: _isPlatformPaySupported,
    confirmPlatformPaySetupIntent: _confirmPlatformPaySetupIntent,
    confirmPlatformPayPayment: _confirmPlatformPayPayment,
    dismissPlatformPay: _dismissPlatformPay,
    createPlatformPayPaymentMethod: _createPlatformPayPaymentMethod,
    createPlatformPayToken: _createPlatformPayToken,
    updatePlatformPaySheet: _updatePlatformPaySheet,
    openPlatformPaySetup: _openPlatformPaySetup,
  };
}
