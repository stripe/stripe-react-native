import StripeSdk from '../NativeStripeSdk';

export function useStripe() {
  return {
    confirmPayment: StripeSdk.confirmPaymentMethod,
    createPaymentMethod: StripeSdk.createPaymentMethod,
    handleNextPaymentAction: StripeSdk.handleNextPaymentAction,
  };
}
