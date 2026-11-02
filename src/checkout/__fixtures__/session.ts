import type { CheckoutElements } from '../../types/CheckoutElements';

const zero = { amount: '$0.00', minorUnitsAmount: 0 };

export const checkoutSession: CheckoutElements.Session = {
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
