import type { AddressDetails } from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native/src/types/Checkout';

export type OrderSummaryRow = {
  label: string;
  value: number;
  emphasized?: boolean;
};

export const toAddressSheetDefaultValues = (
  addressUpdate?: Checkout.AddressUpdate
): AddressDetails | undefined => {
  if (!addressUpdate) {
    return undefined;
  }

  return {
    name: addressUpdate.name,
    phone: addressUpdate.phone,
    address: {
      country: addressUpdate.address.country,
      line1: addressUpdate.address.line1,
      line2: addressUpdate.address.line2,
      city: addressUpdate.address.city,
      state: addressUpdate.address.state,
      postalCode: addressUpdate.address.postalCode,
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
  addressUpdate?: Checkout.AddressUpdate
): string[] => {
  if (!addressUpdate) {
    return [];
  }

  return [
    addressUpdate.name,
    addressUpdate.phone,
    addressUpdate.address.line1,
    addressUpdate.address.line2,
    [
      addressUpdate.address.city,
      addressUpdate.address.state,
      addressUpdate.address.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
    addressUpdate.address.country,
  ].filter(Boolean) as string[];
};

export const getEmojiForProduct = (name: string) => {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes('hoodie')) {
    return '🧥';
  }

  if (normalizedName.includes('shoe')) {
    return '👟';
  }

  return '📦';
};

export const buildOrderSummaryRows = (
  totals?: Checkout.Totals
): OrderSummaryRow[] => {
  if (!totals) {
    return [];
  }

  return [
    { label: 'Subtotal', value: totals.subtotal },
    totals.shipping > 0 ? { label: 'Shipping', value: totals.shipping } : null,
    totals.tax > 0 ? { label: 'Tax', value: totals.tax } : null,
    totals.discount > 0 ? { label: 'Discount', value: totals.discount } : null,
    { label: 'Due today', value: totals.due, emphasized: true },
    { label: 'Total', value: totals.total, emphasized: true },
  ].filter(Boolean) as OrderSummaryRow[];
};

export const deriveSelectedShippingOptionId = (
  session?: Checkout.Session
): string | null => {
  if (!session?.shippingOptions.length || !session.totals) {
    return null;
  }

  const matchingOptions = session.shippingOptions.filter(
    (option) => option.amount === session.totals?.shipping
  );

  return matchingOptions.length === 1 ? matchingOptions[0].id : null;
};
