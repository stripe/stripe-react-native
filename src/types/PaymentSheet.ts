export declare namespace PaymentSheet {
  export type SetupParams = GooglePayParams &
    ApplePayParams & {
      customerId?: string;
      customerEphemeralKeySecret?: string;
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

  type GooglePayParams =
    | {
        googlePay?: true;
        merchantCountryCode: string;
        testEnv?: boolean;
      }
    | {
        googlePay?: false;
        merchantCountryCode?: string;
        testEnv?: boolean;
      };

  export interface PaymentOption {
    label: string;
    image: string;
  }
}
