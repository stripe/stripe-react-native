declare module '@stripe/stripe-react-native' {
  export interface PaymentIntent {
    id: string;
    amount: number;
    created: string;
    currency: string;
    status: IntentStatus;
    description: Nullable<string>;
    receiptEmail: Nullable<string>;
    canceledAt: Nullable<string>;
    clientSecret: string;
    livemode: boolean;
    paymentMethodId: string;
    captureMethod: 'Automatic' | 'Manual';
    confirmationMethod: 'Automatic' | 'Manual';
    lastPaymentError: Nullable<StripeError<string>>;
    shipping: Nullable<PaymentIntent.ShippingDetails>;
  }

  namespace PaymentIntents {
    export interface ShippingDetails {
      address: Address;
      name: string;
      carrier: string;
      phone: string;
      trackingNumber: string;
    }
  }
}
