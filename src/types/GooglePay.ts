export namespace GooglePay {
  export interface CardPaymentMethod {
    type: 'CARD';
    parameters: CardParameters;
    tokenizationSpecification?: {
      type: string;
      parameters: {
        gateway: string;
        gatewayMerchantId: string;
      };
    };
  }

  export interface PayPalPaymentMethod {
    type: 'PAYPAL';
    parameters: PayPalParameters;
    tokenizationSpecification?: {
      type: 'DIRECT';
    };
  }

  export type PaymentMethod = CardPaymentMethod | PayPalPaymentMethod;

  interface PayPalParameters {
    purchase_context: PurchaseContext;
  }

  interface PurchaseContext {
    purchase_units: PurchaseUnit;
  }

  interface PurchaseUnit {
    // See payee in the PayPal Orders API reference documentation for more details.
    // https://developer.paypal.com/docs/archive/checkout/how-to/googlepay-integration/
    payee: object;
  }

  export interface CardParameters {
    allowedAuthMethods: string[];
    allowedCardNetworks: string[];
    allowPrepaidCards?: boolean;
    allowCreditCards?: boolean;
    assuranceDetailsRequired?: boolean;
    billingAddressRequired?: boolean;
    billingAddressParameters?: BillingAddressParameters;
  }

  export interface BillingAddressParameters {
    format?: 'MIN' | 'FULL';
    phoneNumberRequired?: boolean;
  }

  export interface InitParams {
    testEnv: boolean;
    readyToPayParams: {
      apiVersion: number;
      apiVersionMinor: number;
      allowedPaymentMethods: PaymentMethod[];
      existingPaymentMethodRequired?: boolean;
    };
  }

  export interface PayParams {
    clientSecret: string;
    requestParams: {
      apiVersion: number;
      apiVersionMinor: number;
      allowedPaymentMethods: PaymentMethod[];
      merchantInfo: MerchantInfo;
      transactionInfo: TransactionInfo;
      emailRequired?: boolean;
      shippingAddressRequired?: boolean;
      shippingAddressParameters?: ShippingAddressParameters;
    };
  }

  export interface ShippingAddressParameters {
    allowedCountryCodes?: string[];
    phoneNumberRequired?: boolean;
  }

  export interface TransactionInfo {
    currencyCode: string;
    countryCode?: string;
    transactionId?: string;
    totalPriceStatus: 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';
    totalPrice?: string;
    totalPriceLabel?: string;
    checkoutOption?: 'DEFAULT' | 'COMPLETE_IMMEDIATE_PURCHASE';
  }

  export interface MerchantInfo {
    merchantName?: string;
  }
}
