export declare namespace PaymentSheet {
  export type SetupParams = ApplePayParams & {
    customerId: string;
    customerEphemeralKeySecret: string;
    paymentIntentClientSecret: string;
    customFlow?: boolean;
    merchantDisplayName?: string;
    style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
  };

  type ApplePayParams =
    | {
        applePay?: true;
        merchantCountryCode: string;
      }
    | {
        applePay?: false;
        merchantCountryCode?: string;
      };

  export interface PaymentOption {
    label: string;
    image: string;
  }
}
