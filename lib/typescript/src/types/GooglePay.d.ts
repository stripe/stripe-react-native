export declare namespace GooglePay {
    type PresentGooglePayParams = PresentGooglePayType & {
        clientSecret: string;
    };
    type PresentGooglePayType = {
        forSetupIntent?: true;
        currencyCode: string;
    } | {
        forSetupIntent?: false;
    };
    interface SetupIntentParams {
        clientSecret: string;
    }
    interface InitParams {
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
    interface BillingAddressConfig {
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
    interface CreatePaymentMethodParams {
        currencyCode: string;
        amount: number;
    }
}
