export namespace GooglePay {
  export type PresentGooglePayParams = PresentGooglePayType & {
    clientSecret: string;
  };

  export type PresentGooglePayType =
    | {
        /*
         * Present Google Pay to collect customer payment details and use it to confirm the
         * [SetupIntent] represented by [clientSecret].
         */
        forSetupIntent?: true;
        /*
         * The Google Pay API requires a [currencyCode](https://developers.google.com/pay/api/android/reference/request-objects#TransactionInfo).
         * [currencyCode] is required even though the SetupIntent API does not require it.
         */
        currencyCode: string;
      }
    | {
        /*
         * Present Google Pay to collect customer payment details and use it to confirm the
         * [PaymentIntent] represented by [clientSecret].
         */
        forSetupIntent?: false;
      };

  export interface SetupIntentParams {
    clientSecret: string;
  }

  export interface InitParams {
    testEnv: boolean;
    merchantName: string;
    countryCode: string;
    /**
     * Billing address collection configuration.
     */
    billingAddressConfig?: BillingAddressConfig;
    /**
     * Flag to indicate whether Google Pay collect the customer's email address.
     *
     * Default to `false`.
     */
    isEmailRequired?: boolean;
    /**
     * If `true`, Google Pay is considered ready if the customer's Google Pay wallet
     * has existing payment methods.
     *
     * Default to `true`.
     */
    existingPaymentMethodRequired?: boolean;
  }

  export interface BillingAddressConfig {
    isRequired?: boolean;
    /**
     * Billing address format required to complete the transaction.
     */
    format?: 'FULL' | 'MIN';
    /**
     * Set to true if a phone number is required to process the transaction.
     */
    isPhoneNumberRequired?: boolean;
  }

  export interface CreatePaymentMethodParams {
    /*
     * ISO 4217 alphabetic currency code. (e.g. "USD", "EUR")
     */
    currencyCode: string;
    /*
     * Amount intended to be collected. A positive integer representing how much to
     * charge in the smallest currency unit (e.g., 100 cents to charge $1.00 or 100 to charge ¥100,
     * a zero-decimal currency).
     */
    amount: number;
  }
}
