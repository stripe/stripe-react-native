import { useEffect, useState } from 'react';
import type { CreatePaymentMethod } from '@stripe/stripe-react-native';
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
    data: CreatePaymentMethod.Params,
    options: CreatePaymentMethod.Options = {}
  ) => {
    return NativeStripeSdk.createPaymentMethod(data, options);
  };

  return {
    confirmPayment: NativeStripeSdk.confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: StripeSdk.handleCardAction,
    isApplePaySupported: isApplePaySupported,
    presentApplePay: StripeSdk.presentApplePay,
    confirmApplePayPayment: StripeSdk.confirmApplePayPayment,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
  };
}
