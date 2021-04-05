import type Stripe from 'stripe';

export const generateResponse = (
  intent: Stripe.PaymentIntent
):
  | {
      clientSecret: string | null;
      requiresAction: boolean;
      status: string;
    }
  | { clientSecret: string | null; status: string }
  | { error: string } => {
  // Generate a response based on the intent's status
  switch (intent.status) {
    case 'requires_action':
      // Card requires authentication
      return {
        clientSecret: intent.client_secret,
        requiresAction: true,
        status: intent.status,
      };
    case 'requires_payment_method':
      // Card was not properly authenticated, suggest a new payment method
      return {
        error: 'Your card was denied, please provide a new payment method',
      };
    case 'succeeded':
      // Payment is complete, authentication not required
      // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
      console.log('💰 Payment received!');
      return { clientSecret: intent.client_secret, status: intent.status };
  }

  return {
    error: 'Failed',
  };
};
