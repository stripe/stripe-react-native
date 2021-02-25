declare module '@stripe/stripe-react-native' {
  export interface SetupIntent {
    id: string;
    clientSecret: string;
    lastSetupError: Nullable<StripeError<string>>;
    created: Nullable<string>;
    livemode: boolean;
    paymentMethodId: Nullable<string>;
    status: SetupIntents.Status;
    paymentMethodTypes: PaymentMethods.Types[];
    usage: SetupIntents.Usage;
    description: Nullable<string>;
  }

  export namespace SetupIntents {
    type Usage = 'Unknown' | 'None' | 'OnSession' | 'OffSession' | 'OneTime';

    export enum Status {
      Succeeded = 'Succeeded',
      RequiresPaymentMethod = 'RequiresPaymentMethod',
      RequiresConfirmation = 'RequiresConfirmation',
      Canceled = 'Canceled',
      Processing = 'Processing',
      RequiresAction = 'RequiresAction',
      RequiresCapture = 'RequiresCapture',
      Unknown = 'Unknown',
    }
  }
}
