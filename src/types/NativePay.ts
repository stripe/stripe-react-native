import type { Result as Token } from './Token';
import type { Result as PaymentMethod } from './PaymentMethod';
import type { StripeError, NativePayError } from './Errors';
import type {
  CartSummaryItem,
  ContactFieldsType,
  ShippingMethod,
} from './ApplePay';

export type PresentForPaymentMethodParameters = {
  /** Defines Google Pay behavior. Android only. */
  googlePay?: {
    /**
     * Set to true to run in a test environment with relaxed application / merchant requirements. This environment is suggested for early development and for easily testing SDK.
        - Does not require the application to be uploaded to the Google Play Store.
        - Does not require a Google Pay Developer Profile.
        - It uses production data, but at the end of the transaction you will receive a fake and non chargeable payment credential.
        - The user will see a warning message that the app is not recognized/verified.
     */
    testEnv: boolean;
    /** ISO 3166-1 alpha-2 country code where the transaction is processed. */
    merchantCountryCode: string;
    /** ISO 4217 alphabetic currency code. */
    currencyCode: string;
    /** Total monetary value of the transaction. */
    amount: number;
    /** Your merchant name, displayed in the Google Pay sheet. */
    merchantName?: string;
    /** Describes the configuration for billing address collection in the Google Pay sheet. */
    billingAddressConfig?: {
      /** Set to true if billing address is required for payment. Defaults to false. */
      isRequired?: boolean;
      /** Set to true if phone number is required for payment. Defaults to false. */
      isPhoneNumberRequired?: boolean;
      /** Defines what address fields to collect. Defaults to BillingAddressFormat.Min */
      format?: BillingAddressFormat;
    };
    /** Describes the configuration for shipping address collection in the Google Pay sheet. */
    shippingAddressConfig?: {
      /** Set to true if shipping address is required for payment. Defaults to false. */
      isRequired?: boolean;
      /** Set to true if phone number is required for payment. Defaults to false. */
      isPhoneNumberRequired?: boolean;
      /** Set of ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. Defaults to all shipping address countries. */
      allowedCountryCodes?: Array<string>;
    };
    /** Set to true to request an email address. Defaults to false. */
    isEmailRequired?: boolean;
    /** Set to false if you don't support credit cards. Defaults to true. */
    allowCreditCards?: boolean;
  };
  /** Defines Apple Pay behavior. iOS only. */
  applePay?: {
    /** ISO 3166-1 alpha-2 country code where the transaction is processed. */
    merchantCountryCode: string;
    /** ISO 4217 alphabetic currency code. */
    currencyCode: string;
    /** The SDK accepts Amex, Mastercard, Visa, and Discover for Apple Pay by default. Set this property to enable other card networks, for example: ["JCB", "barcode", "chinaUnionPay"]. A full list of possible networks can be found at https://developer.apple.com/documentation/passkit/pkpaymentnetwork. */
    additionalEnabledNetworks?: Array<string>;
    /** The list of items that describe a purchase. For example: total, tax, discount, and grand total. */
    cartItems: Array<CartSummaryItem>;
    /** The list of fields that you need for a shipping contact in order to process the transaction. */
    requiredShippingAddressFields?: Array<ContactFieldsType>;
    /** The list of fields that you need for a billing contact in order to process the transaction. */
    requiredBillingContactFields?: Array<ContactFieldsType>;
    /** An array of shipping method objects that describe the supported shipping methods. */
    shippingMethods?: Array<ShippingMethod>;
    /** Set this value to true to display the coupon code field, or pass the 'couponCode' field to autofill with a coupon code. Defaults to false. */
    supportsCouponCode?: boolean;
    /** Set this value to autofill with a coupon code. */
    couponCode?: string;
    /** Set the payment capabilities you support. If set, 3DS is required. */
    merchantCapabilities?: Array<ApplePayMerchantCapability>;
    /** An optional value that indicates how to ship purchased items. Defaults to 'Shipping'.*/
    shippingType?: ApplePayShippingType;
    /** A list of two-letter ISO 3166 country codes for limiting payment to cards from specific countries or regions. */
    supportedCountries?: Array<string>;
  };
};

export const enum BillingAddressFormat {
  /** Collect name, street address, locality, region, country code, and postal code. */
  Full = 'FULL',
  /** Collect name, country code, and postal code (default). */
  Min = 'MIN',
}

export const enum ApplePayMerchantCapability {
  /** Required. This value must be supplied. */
  Supports3DS = 'supports3DS',
  /** Optional. If present, only transactions that are categorized as credit cards are allowed. */
  SupportsCredit = 'supportsCredit',
  /** Optional. If present, only transactions that are categorized as debit cards are allowed. */
  SupportsDebit = 'supportsDebit',
}

/** A type that indicates how to ship purchased items. */
export const enum ApplePayShippingType {
  /** Default. */
  Shipping = 'shipping',
  Delivery = 'delivery',
  StorePickup = 'storePickup',
  ServicePickup = 'servicePickup',
}

export type PresentForPaymentMethodResult =
  | {
      paymentMethod: PaymentMethod;
      token: Token;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      token?: undefined;
      error: StripeError<NativePayError>;
    };
