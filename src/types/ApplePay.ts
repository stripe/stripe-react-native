export type CartSummaryItemType = 'final' | 'pending';

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
  label: string;
  amount: string;
  type?: CartSummaryItemType;
  identifier: string;
  detail?: string;
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
export interface CartSummaryItem {
  label: string;
  amount: string;
  type?: CartSummaryItemType;
}

export interface PresentParams {
  cartItems: CartSummaryItem[];
  country: string;
  currency: string;
  requiredShippingAddressFields?: ContactFieldsType[];
  requiredBillingContactFields?: ContactFieldsType[];
  shippingMethods?: ShippingMethod[];
  jcbEnabled?: boolean;
}
