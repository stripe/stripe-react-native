import StripeSdk from '../NativeStripeSdk';

export function useStripe() {
  return {
    confirmPayment: StripeSdk.confirmPaymentMethod,
    createPaymentMethod: StripeSdk.createPaymentMethod,
    handleNextPaymentAction: StripeSdk.handleNextPaymentAction,
    isApplePaySupported: () => StripeSdk.isApplePaySupported,
    payWithApplePay: StripeSdk.payWithApplePay,
    completePaymentWithApplePay: StripeSdk.completePaymentWithApplePay,
    confirmSetupIntent: StripeSdk.confirmSetupIntent,
  };
}
