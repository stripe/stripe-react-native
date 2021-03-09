export declare namespace PaymentSheet {
  export type SetupParams = ApplePayParams & {
    customerId: string;
    customerEphemeralKeySecret: string;
    paymentIntentClientSecret: string;
    customFlow?: boolean;
    merchantDisplayName?: string;
    style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
  };

  export type PresentParams =
    | {
        confirmPayment?: false;
      }
    | {
        clientSecret: string;
        confirmPayment?: true;
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
