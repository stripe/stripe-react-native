import type { Nullable, StripeError } from '.';
import type { AuBECSDebitFormComponent } from './components/AuBECSDebitForm';
import type { PaymentMethod, PaymentMethods, PaymentMethodCreateParams } from './PaymentMethods';
export interface SetupIntent {
    id: string;
    clientSecret: string;
    lastSetupError: Nullable<ConfirmSetupIntent.LastPaymentError>;
    created: Nullable<string>;
    livemode: boolean;
    paymentMethodId: Nullable<string>;
    status: SetupIntents.Status;
    paymentMethodTypes: PaymentMethods.Types[];
    usage: SetupIntents.FutureUsage;
    description: Nullable<string>;
}
export declare namespace ConfirmSetupIntent {
    type LastPaymentError = StripeError<string> & {
        paymentMethod: PaymentMethod;
    };
    type Params = CardParams | IdealParams | BancontactParams | SofortParams | AuBecsDebitParams | SepaParams;
    interface Options {
    }
    interface BaseParams {
        billingDetails?: PaymentMethodCreateParams.BillingDetails;
    }
    interface CardParams extends BaseParams {
        type: 'Card';
    }
    interface IdealParams extends BaseParams {
        type: 'Ideal';
        bankName?: string;
    }
    interface SofortParams extends BaseParams {
        type: 'Sofort';
        country: string;
    }
    interface BancontactParams extends Required<BaseParams> {
        type: 'Bancontact';
    }
    interface SepaParams extends Required<BaseParams> {
        type: 'SepaDebit';
        iban: string;
    }
    interface AuBecsDebitParams {
        type: 'AuBecsDebit';
        formDetails: AuBECSDebitFormComponent.FormDetails;
    }
}
export declare namespace SetupIntents {
    type FutureUsage = 'Unknown' | 'None' | 'OnSession' | 'OffSession' | 'OneTime';
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
