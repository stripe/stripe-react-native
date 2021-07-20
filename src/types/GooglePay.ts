export namespace GooglePay {
  export interface PayParams {
    clientSecret: string;
  }

  export interface InitParams {
    testEnv: boolean;
    merchantName: string;
    countryCode: string;
    createPaymentMethod?: boolean;
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
