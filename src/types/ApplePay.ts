export declare namespace ApplePay {
  export type ShippingMethodType = 'final' | 'pending';

  export type ContactFieldsType =
    | 'emailAddress'
    | 'name'
    | 'phoneNumber'
    | 'phoneticName'
    | 'postalAddress';

  export interface ShippingMethod {
    label: string;
    amount: string;
    type?: ShippingMethodType;
    identifier: string;
    detail?: string;
  }

  export interface CartSummaryItem {
    label: string;
    amount: string;
  }

  export interface PresentParams {
    cartItems: CartSummaryItem[];
    country: string;
    currency: string;
    requiredShippingAddressFields?: ContactFieldsType[];
    requiredBillingContactFields?: ContactFieldsType[];
    shippingMethods?: ShippingMethod[];
  }
}
