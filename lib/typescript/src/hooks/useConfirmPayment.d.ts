import type { PaymentMethodCreateParams } from '../types';
/**
 * useConfirmPayment hook
 */
export declare function useConfirmPayment(): {
    confirmPayment: (paymentIntentClientSecret: string, data: PaymentMethodCreateParams.Params, options?: PaymentMethodCreateParams.Options) => Promise<import("../types").ConfirmPaymentResult>;
    loading: boolean;
};
