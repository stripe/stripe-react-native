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
