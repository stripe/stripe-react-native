import type { Nullable, StripeError } from '.';
import type { PaymentMethod } from './PaymentMethods';
export interface PaymentIntent {
    id: string;
    amount: number;
    created: string;
    currency: string;
    status: PaymentIntents.Status;
    description: Nullable<string>;
    receiptEmail: Nullable<string>;
    canceledAt: Nullable<string>;
    clientSecret: string;
    livemode: boolean;
    paymentMethodId: string;
    captureMethod: 'Automatic' | 'Manual';
    confirmationMethod: 'Automatic' | 'Manual';
    lastPaymentError: Nullable<PaymentIntents.LastPaymentError>;
    shipping: Nullable<PaymentIntents.ShippingDetails>;
}
export declare namespace PaymentIntents {
    type LastPaymentError = StripeError<string> & {
        paymentMethod: PaymentMethod;
    };
    interface Address {
        city: string;
        county: string;
        line1: string;
        line2: string;
        postalCode: string;
        state: string;
    }
    type FutureUsage = 'OffSession' | 'OnSession';
    interface ShippingDetails {
        address: Address;
        name: string;
        carrier: string;
        phone: string;
        trackingNumber: string;
    }
    enum Status {
        Succeeded = "Succeeded",
        RequiresPaymentMethod = "RequiresPaymentMethod",
        RequiresConfirmation = "RequiresConfirmation",
        Canceled = "Canceled",
        Processing = "Processing",
        RequiresAction = "RequiresAction",
        RequiresCapture = "RequiresCapture",
        Unknown = "Unknown"
    }
}
