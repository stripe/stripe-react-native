export interface BillingDetails {
  email?: string;
  phone?: string;
  name?: string;
  address?: Address;
}

export interface Address {
  city?: string;
  country?: string;
  line1?: string;
  line2?: string;
  postalCode?: string;
  state?: string;
}

export type AddressDetails = {
  /** The customer's full name. */
  name?: string;
  /** The customer's address. */
  address?: Address;
  /** The customer's phone number. */
  phone?: string;
  /** Whether or not the checkbox is initally selected. Defaults to false.
   *  Note: The checkbox is displayed below the other fields when additionalFields.checkboxLabel is set.
   *  */
  isCheckboxSelected?: boolean;
};

export enum CardBrand {
  JCB = 0,
  Amex = 1,
  CartesBancaires = 2,
  DinersClub = 3,
  Discover = 4,
  Mastercard = 5,
  UnionPay = 6,
  Visa = 7,
  Unknown = 8,
}

/** Theme options for colors used in our UI. */
export type UserInterfaceStyle = 'alwaysLight' | 'alwaysDark' | 'automatic';
