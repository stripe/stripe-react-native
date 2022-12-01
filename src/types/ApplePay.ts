export type ContactFieldsType =
  | 'emailAddress'
  | 'name'
  | 'phoneNumber'
  | 'phoneticName'
  | 'postalAddress';

export type AddressFields =
  | 'street'
  | 'city'
  | 'subAdministrativeArea'
  | 'state'
  | 'postalCode'
  | 'country'
  | 'countryCode'
  | 'subLocality';

export interface ShippingMethod {
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
}

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
  phoneNumber?: number;
  postalAddress: PostalAddress;
}

export type CartSummaryItem =
  | DeferredCartSummaryItem
  | ImmediateCartSummaryItem
  | RecurringCartSummaryItem;

export type CartSummaryItemType = 'Deferred' | 'Immediate' | 'Recurring';

/** Use this type for a payment that occurs in the future, such as a pre-order. Only available on iOS 15 and up, otherwise falls back to ImmediateCartSummaryItem. */
export type DeferredCartSummaryItem = {
  paymentType: 'Deferred';
  /** The unix timestamp of the date, in the future, of the payment. Measured in seconds. */
  deferredDate: number;
  label: string;
  amount: string;
};

/** Use this type for payments that will occur immediately. */
export type ImmediateCartSummaryItem = {
  paymentType: 'Immediate';
  /** When creating items for estimates or charges whose final value is not yet known, set this to true. */
  isPending?: boolean;
  label: string;
  amount: string;
};

/** Use this type for payments that occur more than once, such as a subscription. Only available on iOS 15 and up, otherwise falls back to ImmediateCartSummaryItem.*/
export type RecurringCartSummaryItem = {
  paymentType: 'Recurring';
  /** The amount of time – in calendar units such as day, month, or year – that represents a fraction of the total payment interval. For example, if you set the intervalUnit to 'month' and intervalCount to 3, then the payment interval is three months.*/
  intervalUnit: 'minute' | 'hour' | 'day' | 'month' | 'year';
  /** The number of interval units that make up the total payment interval. For example, if you set the intervalUnit to 'month' and intervalCount to 3, then the payment interval is three months.*/
  intervalCount: number;
  /** The unix timestamp of the start date. Measured in seconds. */
  startDate?: number;
  /** The unix timestamp of the end date. Measured in seconds. */
  endDate?: number;
  label: string;
  amount: string;
};

export interface PresentParams {
  cartItems: CartSummaryItem[];
  country: string;
  currency: string;
  requiredShippingAddressFields?: ContactFieldsType[];
  requiredBillingContactFields?: ContactFieldsType[];
  shippingMethods?: ShippingMethod[];
  jcbEnabled?: boolean;
}
