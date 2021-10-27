export declare namespace PaymentSheet {
    type SetupParams = ClientSecretParams & GooglePayParams & ApplePayParams & {
        customerId?: string;
        customerEphemeralKeySecret?: string;
        customFlow?: boolean;
        merchantDisplayName?: string;
        style?: 'alwaysLight' | 'alwaysDark' | 'automatic';
        returnURL?: string;
        primaryButtonColor?: string;
        defaultBillingDetails?: BillingDetails;
        allowsDelayedPaymentMethods?: boolean;
    };
    type ClientSecretParams = {
        paymentIntentClientSecret: string;
        setupIntentClientSecret?: undefined;
    } | {
        setupIntentClientSecret: string;
        paymentIntentClientSecret?: undefined;
    };
    type ApplePayParams = {
        applePay?: true;
        merchantCountryCode: string;
    } | {
        applePay?: false;
        merchantCountryCode?: string;
    };
    type GooglePayParams = {
        googlePay?: true;
        merchantCountryCode: string;
        testEnv?: boolean;
    } | {
        googlePay?: false;
        merchantCountryCode?: string;
        testEnv?: boolean;
    };
    interface Address {
        city?: string;
        country?: string;
        line1?: string;
        line2?: string;
        postalCode?: string;
        state?: string;
    }
    interface BillingDetails {
        address: Address;
        name?: string;
        email?: string;
        phone?: string;
    }
    interface PaymentOption {
        label: string;
        image: string;
    }
}
