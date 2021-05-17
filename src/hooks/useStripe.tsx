import type {
  PaymentMethodCreateParams,
  ApplePay,
  PaymentSheet,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  ConfirmPaymentMethodResult,
  HandleCardActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  ApplePayResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntent,
} from '../types';
import { useCallback, useEffect, useState } from 'react';
import { isiOS } from '../helpers';
import NativeStripeSdk from '../NativeStripeSdk';
import {
  confirmPaymentMethod,
  createPaymentMethod,
  retrievePaymentIntent,
  confirmApplePayPayment,
  confirmSetupIntent,
  createTokenForCVCUpdate,
  handleCardAction,
  handleURLCallback,
  presentApplePay,
  updateApplePaySummaryItems,
  initPaymentSheet,
  presentPaymentSheet,
  confirmPaymentSheetPayment,
} from '../functions';

/**
 * useStripe hook
 */
export function useStripe() {
  const [isApplePaySupported, setApplePaySupported] = useState(false);

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
      data: PaymentMethodCreateParams.Params,
      options: PaymentMethodCreateParams.Options = {}
    ): Promise<CreatePaymentMethodResult> => {
      return createPaymentMethod(data, options);
    },
    []
  );

  const _retrievePaymentIntent = useCallback(
    async (clientSecret: string): Promise<RetrievePaymentIntentResult> => {
      return retrievePaymentIntent(clientSecret);
    },
    []
  );

  const _confirmPaymentMethod = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: PaymentMethodCreateParams.Params,
      options: PaymentMethodCreateParams.Options = {}
    ): Promise<ConfirmPaymentMethodResult> => {
      return confirmPaymentMethod(paymentIntentClientSecret, data, options);
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
      errorAddressFields: ApplePay.AddressFields[] = []
    ): Promise<ApplePayResult> => {
      return updateApplePaySummaryItems(summaryItems, errorAddressFields);
    },
    []
  );

  const _confirmApplePayPayment = useCallback(
    async (clientSecret: string): Promise<ApplePayResult> => {
      return confirmApplePayPayment(clientSecret);
    },
    []
  );

  const _handleCardAction = useCallback(
    async (
      paymentIntentClientSecret: string
    ): Promise<HandleCardActionResult> => {
      return handleCardAction(paymentIntentClientSecret);
    },
    []
  );

  const _confirmSetupIntent = useCallback(
    async (
      paymentIntentClientSecret: string,
      data: ConfirmSetupIntent.Params,
      options: ConfirmSetupIntent.Options = {}
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
      params: PaymentSheet.PresentParams
    ): Promise<PresentPaymentSheetResult> => {
      return presentPaymentSheet(params);
    },
    []
  );

  const _confirmPaymentSheetPayment = useCallback(async (): Promise<ConfirmPaymentSheetPaymentResult> => {
    return confirmPaymentSheetPayment();
  }, []);

  const _handleURLCallback = useCallback(
    async (url: string): Promise<boolean> => {
      return handleURLCallback(url);
    },
    []
  );

  return {
    retrievePaymentIntent: _retrievePaymentIntent,
    confirmPayment: _confirmPaymentMethod,
    createPaymentMethod: _createPaymentMethod,
    handleCardAction: _handleCardAction,
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
  };
}
