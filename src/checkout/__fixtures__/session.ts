import type { CheckoutElements } from '../../types/CheckoutElements';

const zero = { amount: '$0.00', minorUnitsAmount: 0 };

export const checkoutSession: CheckoutElements.Session = {
  id: 'cs_test',
  availableExpressCheckoutPaymentMethods: {
    applePay: { available: false, type: 'apple_pay' },
    googlePay: { available: false, type: 'google_pay' },
    link: { available: false, type: 'link' },
  },
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

/** A session where an express wallet (Link) is available. */
export const checkoutSessionWithExpressWallet: CheckoutElements.Session = {
  ...checkoutSession,
  availableExpressCheckoutPaymentMethods: {
    ...checkoutSession.availableExpressCheckoutPaymentMethods,
    link: { available: true, type: 'link' },
  },
};
