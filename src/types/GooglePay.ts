export namespace GooglePay {
  export interface CardPaymentMethod {
    type: 'CARD';
    parameters: CardParameters;
    // https://developers.google.com/pay/api/android/reference/request-objects#PaymentMethodTokenizationSpecification
    tokenizationSpecification?: TokenizationSpecification;
  }

  export interface PayPalPaymentMethod {
    type: 'PAYPAL';
    parameters: PayPalParameters;
    // https://developers.google.com/pay/api/android/reference/request-objects#PaymentMethodTokenizationSpecification
    tokenizationSpecification?: TokenizationSpecification;
  }

  export interface TokenizationSpecification {
    type: 'PAYMENT_GATEWAY' | 'DIRECT';
    parameters?: {
      gateway: string;
      gatewayMerchantId: string;
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
    // https://developers.google.com/pay/api/android/reference/request-objects#BillingAddressParameters
    billingAddressParameters?: BillingAddressParameters;
  }

  export interface BillingAddressParameters {
    format?: 'MIN' | 'FULL';
    phoneNumberRequired?: boolean;
  }

  export interface InitParams {
    testEnv: boolean;
    // https://developers.google.com/pay/api/android/reference/request-objects#IsReadyToPayRequest
    readyToPayParams: IsReadyToPayRequest;
  }

  export interface IsReadyToPayRequest {
    apiVersion: number;
    apiVersionMinor: number;
    // https://developers.google.com/pay/api/android/reference/request-objects#PaymentMethod
    allowedPaymentMethods: PaymentMethod[];
    existingPaymentMethodRequired?: boolean;
  }

  export interface PayParams {
    clientSecret: string;
    // https://developers.google.com/pay/api/android/reference/request-objects#PaymentDataRequest
    requestParams: PaymentDataRequest;
  }

  export interface PaymentDataRequest {
    apiVersion: number;
    apiVersionMinor: number;
    // https://developers.google.com/pay/api/android/reference/request-objects#PaymentMethod
    allowedPaymentMethods: PaymentMethod[];
    merchantInfo: MerchantInfo;
    // https://developers.google.com/pay/api/android/reference/request-objects#TransactionInfo
    transactionInfo: TransactionInfo;
    emailRequired?: boolean;
    shippingAddressRequired?: boolean;
    // https://developers.google.com/pay/api/android/reference/request-objects#ShippingAddressParameters
    shippingAddressParameters?: ShippingAddressParameters;
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
