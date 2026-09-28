import type { Checkout } from '../../types/Checkout';

const zero = { amount: '$0.00', minorUnitsAmount: 0 };

export const checkoutSession: Checkout.Session = {
  id: 'cs_test',
  currency: 'usd',
  livemode: false,
  status: { type: 'open' },
  orderSummaryItems: [],
  discountAmounts: [],
  totals: {
    subtotal: zero,
    taxExclusive: zero,
    taxInclusive: zero,
    discount: zero,
    total: zero,
  },
};
