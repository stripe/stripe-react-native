import type Stripe from 'stripe';
export declare const generateResponse: (intent: Stripe.PaymentIntent) => {
    clientSecret: string | null;
    requiresAction: boolean;
    status: string;
} | {
    clientSecret: string | null;
    status: string;
} | {
    error: string;
};
