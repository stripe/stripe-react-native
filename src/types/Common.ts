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
