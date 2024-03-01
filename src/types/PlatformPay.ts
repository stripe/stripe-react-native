import type { Result as Token } from './Token';
import type { Result as PaymentMethod } from './PaymentMethod';
import type { Result as PaymentIntent } from './PaymentIntent';
import type { Result as SetupIntent } from './SetupIntent';
import type { StripeError, PlatformPayError } from './Errors';

export type ApplePaySheetError =
  | {
      errorType: ApplePaySheetErrorType.InvalidShippingAddress;
      field: InvalidShippingField;
      message?: string;
    }
  | {
      errorType:
        | ApplePaySheetErrorType.UnserviceableShippingAddress
        | ApplePaySheetErrorType.InvalidCouponCode
        | ApplePaySheetErrorType.ExpiredCouponCode;
      message?: string;
    };

export enum ApplePaySheetErrorType {
  InvalidShippingAddress = 'InvalidShippingAddress',
  UnserviceableShippingAddress = 'UnserviceableShippingAddress',
  InvalidCouponCode = 'InvalidCouponCode',
  ExpiredCouponCode = 'ExpiredCouponCode',
}

export enum ContactField {
  EmailAddress = 'emailAddress',
  Name = 'name',
  PhoneNumber = 'phoneNumber',
  PhoneticName = 'phoneticName',
  PostalAddress = 'postalAddress',
}

export enum InvalidShippingField {
  Street = 'street',
  City = 'city',
  SubAdministrativeArea = 'subAdministrativeArea',
  State = 'state',
  PostalCode = 'postalCode',
  Country = 'country',
  CountryCode = 'countryCode',
  SubLocality = 'subLocality',
}

export type ApplePayBaseParams = {
  /** ISO 3166-1 alpha-2 country code where the transaction is processed. */
  merchantCountryCode: string;
  /** ISO 4217 alphabetic currency code. */
  currencyCode: string;
  /** The SDK accepts Amex, Mastercard, Visa, and Discover for Apple Pay by default. Set this property to enable other card networks, for example: ["JCB", "barcode", "chinaUnionPay"]. A full list of possible networks can be found at https://developer.apple.com/documentation/passkit/pkpaymentnetwork. */
  additionalEnabledNetworks?: Array<string>;
  /** The list of items that describe a purchase. For example: total, tax, discount, and grand total. */
  cartItems: Array<CartSummaryItem>;
  /** The list of fields that you need for a shipping contact in order to process the transaction. If you include ContactField.PostalAddress in this array, you must implement the PlatformPayButton component's `onShippingContactSelected` callback and call `updatePlatformPaySheet` from there.*/
  requiredShippingAddressFields?: Array<ContactField>;
  /** The list of fields that you need for a billing contact in order to process the transaction. */
  requiredBillingContactFields?: Array<ContactField>;
  /** An array of shipping method objects that describe the supported shipping methods. If provided, you must implement the PlatformPayButton component's `onShippingMethodSelected` callback and call `updatePlatformPaySheet` from there. */
  shippingMethods?: Array<ShippingMethod>;
  /** Set the payment capabilities you support. If set, 3DS is required. */
  merchantCapabilities?: Array<ApplePayMerchantCapability>;
  /** An optional value that indicates how to ship purchased items. Defaults to 'Shipping'.*/
  shippingType?: ApplePayShippingType;
  /** A list of two-letter ISO 3166 country codes for limiting payment to cards from specific countries or regions. */
  supportedCountries?: Array<string>;
};

export type ApplePayConfirmParams = {
  /** A typical request is for a one-time payment. To support different types of payment requests, include a PaymentRequestType. Only supported on iOS 16 and up. */
  request?:
    | RecurringPaymentRequest
    | AutomaticReloadPaymentRequest
    | MultiMerchantRequest;
};

export enum PaymentRequestType {
  Recurring = 'Recurring',
  AutomaticReload = 'AutomaticReload',
  MultiMerchant = 'MultiMerchant',
}

/** Use this for a recurring payment, typically a subscription. */
export type RecurringPaymentRequest = {
  type: PaymentRequestType.Recurring;
  /** A description that you provide of the recurring payment and that Apple Pay displays to the user in the sheet. */
  description: string;
  /** A URL to a web page where the user can update or delete the payment method for the recurring payment. */
  managementUrl: string;
  /** The regular billing cycle for the payment, including start and end dates, an interval, and an interval count. */
  billing: RecurringCartSummaryItem;
  /** Same as the billing property, but use this if the purchase has a trial period. */
  trialBilling?: RecurringCartSummaryItem;
  /** A localized billing agreement that the sheet displays to the user before the user authorizes the payment. */
  billingAgreement?: string;
  /** A URL you provide to receive life-cycle notifications from the Apple Pay servers about the Apple Pay merchant token for the recurring payment.
   * For more information about handling merchant token life-cycle notifications, see Receiving and handling merchant token notifications.
   */
  tokenNotificationURL?: string;
};

/** Use this for an automatic reload or refill payment, such as a store card top-up. */
export type AutomaticReloadPaymentRequest = {
  type: PaymentRequestType.AutomaticReload;
  /** A description that you provide of the recurring payment and that Apple Pay displays to the user in the sheet. */
  description: string;
  /** A URL to a web page where the user can update or delete the payment method for the recurring payment. */
  managementUrl: string;
  /** A short, localized description of the item. */
  label: string;
  /** This is the amount that is automatically applied to the account when the account balance drops below the threshold amount. */
  reloadAmount: string;
  /** The balance an account reaches before you apply the automatic reload amount. */
  thresholdAmount: string;
  /** A localized billing agreement that the sheet displays to the user before the user authorizes the payment. */
  billingAgreement?: string;
  /** A URL you provide to receive life-cycle notifications from the Apple Pay servers about the Apple Pay merchant token for the recurring payment.
   * For more information about handling merchant token life-cycle notifications, see Receiving and handling merchant token notifications.
   */
  tokenNotificationURL?: string;
};

/** Use this to indicate payments for multiple merchants. */
export type MultiMerchantRequest = {
  type: PaymentRequestType.MultiMerchant;
  merchants: Array<{
    /** The Apple Pay merchant identifier. */
    merchantIdentifier: string;
    /** An external identifier for the merchant. */
    externalIdentifier: string;
    /** The merchant’s display name that the Apple Pay server associates with the payment token. */
    merchantName: string;
    /** The merchant’s top-level domain that the Apple Pay server associates with the payment token. */
    merchantDomain?: string;
    /** The amount to authorize for the payment token. */
    amount: string;
  }>;
};

export type ApplePayPaymentMethodParams = {
  /** Set this value to true to display the coupon code field, or pass the 'couponCode' field to autofill with a coupon code. Defaults to false. If true, you must implement the PlatformPayButton component's `onCouponCodeEntered` callback and call `updatePlatformPaySheet` from there. */
  supportsCouponCode?: boolean;
  /** Set this value to autofill with a coupon code. If provided, you must implement the PlatformPayButton component's `onCouponCodeEntered` callback and call `updatePlatformPaySheet` from there. */
  couponCode?: string;
};

export enum ApplePayMerchantCapability {
  /** Required. This value must be supplied. */
  Supports3DS = 'supports3DS',
  /** Optional. If present, only transactions that are categorized as credit cards are allowed. */
  SupportsCredit = 'supportsCredit',
  /** Optional. If present, only transactions that are categorized as debit cards are allowed. */
  SupportsDebit = 'supportsDebit',
}

/** A type that indicates how to ship purchased items. */
export enum ApplePayShippingType {
  /** Default. */
  Shipping = 'shipping',
  Delivery = 'delivery',
  StorePickup = 'storePickup',
  ServicePickup = 'servicePickup',
}

export type GooglePayBaseParams = {
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
  /** Your merchant name, displayed in the Google Pay sheet. */
  merchantName?: string;
  /** Set to true to request an email address. Defaults to false. */
  isEmailRequired?: boolean;
  /** Set to false if you don't support credit cards. Defaults to true. */
  allowCreditCards?: boolean;
  /** If true, Google Pay is considered "available" if the customer's Google Pay wallet has an existing payment method. Defaults to false. */
  existingPaymentMethodRequired?: boolean;
  /** Describes the configuration for billing address collection in the Google Pay sheet. */
  billingAddressConfig?: {
    /** Set to true if billing address is required for payment. Defaults to false. */
    isRequired?: boolean;
    /** Set to true if phone number is required for payment. Defaults to false. */
    isPhoneNumberRequired?: boolean;
    /** Defines what address fields to collect. Defaults to BillingAddressFormat.Min */
    format?: BillingAddressFormat;
  };
  /** An optional label to display with the amount. Google Pay may or may not display this label depending on its own internal logic. Defaults to a generic label if none is provided. */
  label?: string;
  /** An optional amount to display for setup intents. Google Pay may or may not display this amount depending on its own internal logic. Defaults to 0 if none is provided. Provide this value in the currency’s smallest unit. */
  amount?: number;
};

export type GooglePayPaymentMethodParams = {
  /** Describes the configuration for shipping address collection in the Google Pay sheet. */
  shippingAddressConfig?: {
    /** Set to true if shipping address is required for payment. Defaults to false. */
    isRequired?: boolean;
    /** Set to true if phone number is required for payment. Defaults to false. */
    isPhoneNumberRequired?: boolean;
    /** Set of ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. Defaults to all shipping address countries. */
    allowedCountryCodes?: Array<string>;
  };
};

export enum BillingAddressFormat {
  /** Collect name, street address, locality, region, country code, and postal code. */
  Full = 'FULL',
  /** Collect name, country code, and postal code (default). */
  Min = 'MIN',
}

export type PaymentMethodParams = {
  /** Defines Google Pay behavior. Android only. */
  googlePay?: GooglePayBaseParams & GooglePayPaymentMethodParams;
  /** Defines Apple Pay behavior. iOS only. */
  applePay?: ApplePayBaseParams & ApplePayPaymentMethodParams;
};

export type ConfirmParams = {
  /** Defines Google Pay behavior. Android only. */
  googlePay?: GooglePayBaseParams;
  /** Defines Apple Pay behavior. iOS only. */
  applePay?: ApplePayBaseParams & ApplePayConfirmParams;
};

export enum ButtonType {
  /** A button with the Apple Pay or Google Pay logo only, useful when an additional call to action isn't needed. */
  Default = 0,
  /** A button useful for product purchases. */
  Buy = 1,
  /** A button useful for booking trips, flights, or other experiences. */
  Book = 6,
  /** A button useful for purchase experiences that include other payment buttons that start with “Check out”. */
  Checkout = 5,
  /** A button used by approved nonprofit organization that lets people make donations. */
  Donate = 4,
  /** A button useful for placing orders for such as like meals or flowers. */
  Order = 11,
  /** A button useful for purchasing a subscription such as a gym membership or meal-kit delivery service. */
  Subscribe = 7,
  /** iOS only. A button useful for prompting the user to set up a card. */
  SetUp = 2,
  /** iOS only. A button useful for paying bills or invoices. */
  InStore = 3,
  /** iOS only. A button useful for adding money to a card, account, or payment system.*/
  Reload = 8,
  /** iOS only. A button useful for adding money to a card, account, or payment system. */
  AddMoney = 9,
  /** iOS only. A button useful for adding money to a card, account, or payment system. */
  TopUp = 10,
  /** iOS only. A button useful for renting items such as cars or scooters. */
  Rent = 12,
  /** iOS only. A button useful supporting people give money to projects, causes, organizations, and other entities.*/
  Support = 13,
  /** iOS only. A button useful to help people contribute money to projects, causes, organizations, and other entities. */
  Contribute = 14,
  /** iOS only. A button useful useful for letting people tip for goods or services. */
  Tip = 15,
  /** iOS only. A button useful for general purchases. */
  Continue = 16,
  /** Android only. A button useful for general payments. */
  Pay = 1000,
  /** Android only. The Google Pay payment button without the additional text. */
  GooglePayMark = 1001,
}

/** iOS only. */
export enum ButtonStyle {
  /** A white button with black lettering. */
  White = 0,
  /** A white button with black lettering and a black outline. */
  WhiteOutline = 1,
  /** A black button with white lettering. */
  Black = 2,
  /** Default. A button that automatically changes its appearance when the user switches between Light Mode and Dark Mode. */
  Automatic = 3,
}

/** iOS only. */
export type CartSummaryItem =
  | DeferredCartSummaryItem
  | ImmediateCartSummaryItem
  | RecurringCartSummaryItem;

/** iOS only. */
export enum PaymentType {
  Deferred = 'Deferred',
  Immediate = 'Immediate',
  Recurring = 'Recurring',
}

/** iOS only. Use this type for a payment that occurs in the future, such as a pre-order. Only available on iOS 15 and up, otherwise falls back to ImmediateCartSummaryItem. */
export type DeferredCartSummaryItem = {
  paymentType: PaymentType.Deferred;
  /** The unix timestamp of the date, in the future, of the payment. Measured in seconds. */
  deferredDate: number;
  label: string;
  amount: string;
};

/** iOS only. Use this type for payments that will occur immediately. */
export type ImmediateCartSummaryItem = {
  paymentType: PaymentType.Immediate;
  /** When creating items for estimates or charges whose final value is not yet known, set this to true. */
  isPending?: boolean;
  label: string;
  amount: string;
};

/** iOS only. Use this type for payments that occur more than once, such as a subscription. Only available on iOS 15 and up, otherwise falls back to ImmediateCartSummaryItem.*/
export type RecurringCartSummaryItem = {
  paymentType: PaymentType.Recurring;
  /** The amount of time – in calendar units such as Day, Month, or Year – that represents a fraction of the total payment interval. For example, if you set the intervalUnit to 'Month' and intervalCount to 3, then the payment interval is three months.*/
  intervalUnit: IntervalUnit;
  /** The number of interval units that make up the total payment interval. For example, if you set the intervalUnit to 'Month' and intervalCount to 3, then the payment interval is three months.*/
  intervalCount: number;
  /** The unix timestamp of the start date. Measured in seconds. */
  startDate?: number;
  /** The unix timestamp of the end date. Measured in seconds. */
  endDate?: number;
  label: string;
  amount: string;
};

/** iOS only. */
export enum IntervalUnit {
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

/** iOS only. */
export type ShippingMethod = {
  /** A short, localized description. */
  label: string;
  /** The cost associated with this shipping option. */
  amount: string;
  /** When creating items for estimates or charges whose final value is not yet known, set this to true. */
  isPending?: boolean;
  /** A unique identifier for the shipping method. */
  identifier: string;
  /** A user-readable description of the shipping method. For example “Ships in 24 hours.” Don't repeat the content of the 'label' property. */
  detail?: string;
  /** The unix timestamp of the start date of the expected range of delivery or shipping dates for a package, or the time range when an item is available for pickup. Measured in seconds. */
  startDate?: number;
  /** The unix timestamp of the end date of the expected range of delivery or shipping dates for a package, or the time range when an item is available for pickup. Measured in seconds. */
  endDate?: number;
};

interface PostalAddress {
  city?: string;
  country?: string;
  postalCode?: string;
  state?: string;
  street?: string;
  isoCountryCode?: string;
  subAdministrativeArea?: string;
  subLocality?: string;
}

interface ContactName {
  familyName?: string;
  namePrefix?: string;
  nameSuffix?: string;
  givenName?: string;
  middleName?: string;
  nickname?: string;
}

export interface ShippingContact {
  emailAddress?: string;
  name: ContactName;
  phoneNumber?: string;
  postalAddress: PostalAddress;
}

/** Android only. */
export type IsGooglePaySupportedParams = {
  /** Set to true to run in a test environment with relaxed application / merchant requirements. This environment is suggested for early development and for easily testing SDK. Defaults to false. */
  testEnv?: boolean;
  /**
   * If `true`, Google Pay is considered ready if the customer's Google Pay wallet
   * has an existing payment method. Defaults to false.
   */
  existingPaymentMethodRequired?: boolean;
};

export type PaymentMethodResult =
  | {
      paymentMethod: PaymentMethod;
      shippingContact?: ShippingContact;
      error?: undefined;
    }
  | {
      paymentMethod?: undefined;
      shippingContact?: undefined;
      error: StripeError<PlatformPayError>;
    };

export type TokenResult =
  | {
      token: Token;
      shippingContact?: ShippingContact;
      error?: undefined;
    }
  | {
      token?: undefined;
      shippingContact?: undefined;
      error: StripeError<PlatformPayError>;
    };

export type ConfirmPaymentResult =
  | {
      paymentIntent: PaymentIntent;
      error?: StripeError<PlatformPayError>;
    }
  | {
      paymentIntent?: undefined;
      error: StripeError<PlatformPayError>;
    };

export type ConfirmSetupIntentResult =
  | {
      setupIntent: SetupIntent;
      error?: StripeError<PlatformPayError>;
    }
  | {
      setupIntent?: undefined;
      error: StripeError<PlatformPayError>;
    };
