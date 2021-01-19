import { useEffect, useState } from 'react';
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

  return {
    confirmPayment: StripeSdk.confirmPaymentMethod,
    createPaymentMethod: StripeSdk.createPaymentMethod,
    handleCardAction: StripeSdk.handleCardAction,
    isApplePaySupported: isApplePaySupported,
    payWithApplePay: StripeSdk.payWithApplePay,
    completePaymentWithApplePay: StripeSdk.completePaymentWithApplePay,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
  };
}
