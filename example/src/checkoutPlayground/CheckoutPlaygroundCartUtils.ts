import type { AddressDetails } from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native/src/types/Checkout';

export type OrderSummaryRow = {
  label: string;
  value: string;
  emphasized?: boolean;
};

// Pre-fills the AddressSheet with Stripe HQ when the session has no address yet
// so the playground doesn't require manually typing every field on every run.
const DEFAULT_ADDRESS_SHEET_VALUES: AddressDetails = {
  address: {
    country: 'US',
    line1: '354 Oyster Point Blvd',
    city: 'South San Francisco',
    state: 'CA',
    postalCode: '94080',
  },
};

export const toAddressSheetDefaultValues = (
  contactAddress?: Checkout.ContactAddress
): AddressDetails => {
  if (!contactAddress) {
    return DEFAULT_ADDRESS_SHEET_VALUES;
  }

  return {
    name: contactAddress.name,
    phone: contactAddress.phone,
    address: {
      country: contactAddress.address.country,
      line1: contactAddress.address.line1,
      line2: contactAddress.address.line2,
      city: contactAddress.address.city,
      state: contactAddress.address.state,
      postalCode: contactAddress.address.postalCode,
    },
  };
};

export const toCheckoutAddress = (
  address?: AddressDetails['address']
): Checkout.Address => ({
  country: address?.country || 'US',
  line1: address?.line1,
  line2: address?.line2,
  city: address?.city,
  state: address?.state,
  postalCode: address?.postalCode,
});

export const getAddressLines = (
  contactAddress?: Checkout.ContactAddress
): string[] => {
  if (!contactAddress) {
    return [];
  }

  return [
    contactAddress.name,
    contactAddress.phone,
    contactAddress.address.line1,
    contactAddress.address.line2,
    [
      contactAddress.address.city,
      contactAddress.address.state,
      contactAddress.address.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
    contactAddress.address.country,
  ].filter(Boolean) as string[];
};

export const buildOrderSummaryRows = (
  total?: Checkout.Total
): OrderSummaryRow[] => {
  if (!total) {
    return [];
  }

  return [
    { label: 'Subtotal', value: total.subtotal.amount },
    total.shippingRate.minorUnitsAmount > 0
      ? { label: 'Shipping', value: total.shippingRate.amount }
      : null,
    total.taxExclusive.minorUnitsAmount > 0
      ? { label: 'Tax', value: total.taxExclusive.amount }
      : null,
    total.discount.minorUnitsAmount > 0
      ? { label: 'Discount', value: total.discount.amount }
      : null,
    { label: 'Total', value: total.total.amount, emphasized: true },
  ].filter(Boolean) as OrderSummaryRow[];
};

export const deriveSelectedShippingOptionId = (
  session?: Checkout.Session
): string | null => {
  if (!session?.shipping) {
    return null;
  }

  return session.shipping.shippingOption.id;
};
