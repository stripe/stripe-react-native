import type { GooglePay } from '../types';
/**
 * useGooglePay hook
 */
export declare function useGooglePay(): {
    loading: boolean;
    initGooglePay: (params: GooglePay.InitParams) => Promise<import("../types").GooglePayInitResult>;
    presentGooglePay: (params: GooglePay.PresentGooglePayParams) => Promise<import("../types").PayWithGooglePayResult>;
    createGooglePayPaymentMethod: (params: GooglePay.CreatePaymentMethodParams) => Promise<import("../types").CreateGooglePayPaymentMethodResult>;
};
