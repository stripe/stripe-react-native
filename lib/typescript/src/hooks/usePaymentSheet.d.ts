import type { PaymentSheet } from '../types';
/**
 * usePaymentSheet hook
 */
export declare function usePaymentSheet(): {
    loading: boolean;
    initPaymentSheet: (params: PaymentSheet.SetupParams) => Promise<import("../types").InitPaymentSheetResult>;
    presentPaymentSheet: () => Promise<import("../types").PresentPaymentSheetResult>;
    confirmPaymentSheetPayment: () => Promise<import("../types").ConfirmPaymentSheetPaymentResult>;
};
