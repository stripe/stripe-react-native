import type {
  PaymentMethod,
  PaymentIntent,
  ApplePay,
  PaymentSheet,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  ConfirmPaymentResult,
  HandleNextActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  ApplePayResult,
  ApplePayError,
  StripeError,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  SetupIntent,
  CreateTokenResult,
  PayWithGooglePayResult,
  GooglePayInitResult,
  GooglePay,
  CreateGooglePayPaymentMethodResult,
  OpenApplePaySetupResult,
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
import { useCallback, useEffect, useState } from 'react';
import { isiOS } from '../helpers';
import NativeStripeSdk from '../NativeStripeSdk';
import {
  confirmPayment,
  createPaymentMethod,
  retrievePaymentIntent,
  retrieveSetupIntent,
  confirmApplePayPayment,
  confirmSetupIntent,
  createTokenForCVCUpdate,
  handleNextAction,
  handleURLCallback,
  presentApplePay,
  updateApplePaySummaryItems,
  initPaymentSheet,
  presentPaymentSheet,
  confirmPaymentSheetPayment,
  createToken,
  isGooglePaySupported,
  initGooglePay,
  createGooglePayPaymentMethod,
  presentGooglePay,
  openApplePaySetup,
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

/**
 * useStripe hook
 */
export function useStripe() {
  const [isApplePaySupported, setApplePaySupported] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    async function checkApplePaySupport() {
      const isSupported =
        isiOS && (await NativeStripeSdk.isApplePaySupported());
      setApplePaySupported(isSupported);
    }

    checkApplePaySupport();
  }, []);

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

  const _presentApplePay = useCallback(
    async (params: ApplePay.PresentParams): Promise<ApplePayResult> => {
      return presentApplePay(params);
    },
    []
  );

  const _updateApplePaySummaryItems = useCallback(
    async (
      summaryItems: ApplePay.CartSummaryItem[],
      errorAddressFields: Array<{
        field: ApplePay.AddressFields;
        message?: string;
      }> = []
    ): Promise<{ error?: StripeError<ApplePayError> }> => {
      return updateApplePaySummaryItems(summaryItems, errorAddressFields);
    },
    []
  );

  const _confirmApplePayPayment = useCallback(
    async (
      clientSecret: string
    ): Promise<{ error?: StripeError<ApplePayError> }> => {
      return confirmApplePayPayment(clientSecret);
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

  const _presentPaymentSheet =
    useCallback(async (): Promise<PresentPaymentSheetResult> => {
      return presentPaymentSheet();
    }, []);

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

  const _isGooglePaySupported = useCallback(
    async (params?: GooglePay.IsSupportedParams): Promise<boolean> => {
      return isGooglePaySupported(params);
    },
    []
  );

  const _initGooglePay = useCallback(
    async (params: GooglePay.InitParams): Promise<GooglePayInitResult> => {
      return initGooglePay(params);
    },
    []
  );

  const _presentGooglePay = useCallback(
    async (
      params: GooglePay.PresentParams
    ): Promise<PayWithGooglePayResult> => {
      return presentGooglePay(params);
    },
    []
  );

  const _createGooglePayPaymentMethod = useCallback(
    async (
      params: GooglePay.CreatePaymentMethodParams
    ): Promise<CreateGooglePayPaymentMethodResult> => {
      return createGooglePayPaymentMethod(params);
    },
    []
  );

  const _openApplePaySetup =
    useCallback(async (): Promise<OpenApplePaySetupResult> => {
      return openApplePaySetup();
    }, []);

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
    async (clientSecret: string): Promise<FinancialConnections.TokenResult> => {
      return collectBankAccountToken(clientSecret);
    },
    []
  );

  const _collectFinancialConnectionsAccounts = useCallback(
    async (
      clientSecret: string
    ): Promise<FinancialConnections.SessionResult> => {
      return collectFinancialConnectionsAccounts(clientSecret);
    },
    []
  );

  const _resetPaymentSheetCustomer = useCallback(async (): Promise<null> => {
    return resetPaymentSheetCustomer();
  }, []);

  const _isPlatformPaySupported = useCallback(
    async (params?: {
      googlePay?: GooglePay.IsSupportedParams;
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
    isApplePaySupported: isApplePaySupported,
    presentApplePay: _presentApplePay,
    confirmApplePayPayment: _confirmApplePayPayment,
    confirmSetupIntent: _confirmSetupIntent,
    createTokenForCVCUpdate: _createTokenForCVCUpdate,
    updateApplePaySummaryItems: _updateApplePaySummaryItems,
    handleURLCallback: _handleURLCallback,
    confirmPaymentSheetPayment: _confirmPaymentSheetPayment,
    presentPaymentSheet: _presentPaymentSheet,
    initPaymentSheet: _initPaymentSheet,
    createToken: _createToken,
    isGooglePaySupported: _isGooglePaySupported,
    initGooglePay: _initGooglePay,
    presentGooglePay: _presentGooglePay,
    createGooglePayPaymentMethod: _createGooglePayPaymentMethod,
    openApplePaySetup: _openApplePaySetup,
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
