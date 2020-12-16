import { useEffect, useState } from 'react';
import { isiOS } from '../platform';
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
    handleNextPaymentAction: StripeSdk.handleNextPaymentAction,
    isApplePaySupported: isApplePaySupported,
    payWithApplePay: StripeSdk.payWithApplePay,
    completePaymentWithApplePay: StripeSdk.completePaymentWithApplePay,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
  };
}
