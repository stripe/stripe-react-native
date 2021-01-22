import { useEffect, useState } from 'react';
import type { CreatePaymentMethodData } from 'src/types';
import { isiOS } from '../helpers';
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

  const createPaymentMethod = (data: CreatePaymentMethodData) => {
    const { billingDetails, type } = data;
    if ('card' in data) {
      return StripeSdk.createPaymentMethod(type, billingDetails, data.card);
    }
    return StripeSdk.createPaymentMethod(type, billingDetails);
  };

  return {
    confirmPayment: StripeSdk.confirmPaymentMethod,
    createPaymentMethod: createPaymentMethod,
    handleCardAction: StripeSdk.handleCardAction,
    isApplePaySupported: isApplePaySupported,
    presentApplePay: StripeSdk.presentApplePay,
    confirmApplePayPayment: StripeSdk.confirmApplePayPayment,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
  };
}
