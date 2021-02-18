import { useEffect, useState } from 'react';
import type {
  PaymentMethodData,
  PaymentMethodOptions,
  SetupPaymentSheetParams,
} from '../types';
import { isiOS } from '../helpers';
import NativeStripeSdk from '../NativeStripeSdk';
import StripeSdk from '../NativeStripeSdk';

export function useStripe() {
  const [isApplePaySupported, setApplePaySupported] = useState(false);

  useEffect(() => {
    async function checkApplePaySupport() {
      const isSupported = isiOS ?? (await StripeSdk.isApplePaySupported());
      setApplePaySupported(isSupported);
    }

    checkApplePaySupport();
  }, []);

  const createPaymentMethod = (
    data: PaymentMethodData,
    options: PaymentMethodOptions = {}
  ) => {
    return NativeStripeSdk.createPaymentMethod(data, options);
  };

  const setupPaymentSheet = (params: SetupPaymentSheetParams) => {
    return NativeStripeSdk.setupPaymentSheet(params);
  };

  const presentPaymentSheet = () => {
    return NativeStripeSdk.presentPaymentSheet();
  };

  const presentPaymentOptions = () => {
    return NativeStripeSdk.presentPaymentOptions();
  };

  const paymentSheetConfirmPayment = () => {
    return NativeStripeSdk.paymentSheetConfirmPayment();
  };

  return {
    retrievePaymentIntent: NativeStripeSdk.retrievePaymentIntent,
    confirmPayment: NativeStripeSdk.confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: StripeSdk.handleCardAction,
    isApplePaySupported: isApplePaySupported,
    presentApplePay: StripeSdk.presentApplePay,
    confirmApplePayPayment: StripeSdk.confirmApplePayPayment,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
    setupPaymentSheet: setupPaymentSheet,
    presentPaymentSheet: presentPaymentSheet,
    presentPaymentOptions: presentPaymentOptions,
    paymentSheetConfirmPayment: paymentSheetConfirmPayment,
  };
}
