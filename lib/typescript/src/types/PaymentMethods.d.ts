import type { AuBECSDebitFormComponent } from './components/AuBECSDebitForm';
import type { Card } from './Card';
import type { PaymentIntents } from './PaymentIntents';
export interface PaymentMethod {
    id: string;
    liveMode: boolean;
    customerId: string;
    billing_details: PaymentMethods.BillingDetails;
    type: PaymentMethods.Types;
    AuBecsDebit: PaymentMethods.AuBecsDebit;
    BacsDebit: PaymentMethods.BacsDebit;
    card: PaymentMethods.Card;
    Fpx: PaymentMethods.Fpx;
    Ideal: PaymentMethods.Ideal;
    SepaDebit: PaymentMethods.SepaDebit;
    Sofort: PaymentMethods.Sofort;
    Upi: PaymentMethods.Upi;
}
export declare namespace PaymentMethodCreateParams {
    type Params = CardParams | IdealParams | OxxoParams | P24Params | AlipayParams | GiropayParams | SepaParams | EpsParams | AuBecsDebitParams | SofortParams | GrabPayParams | FPXParams | AfterpayClearpayParams | BancontactParams;
    type BillingDetails = {
        email?: string;
        name?: string;
        phone?: string;
        addressPostalCode?: string;
        addressCity?: string;
        addressCountry?: string;
        addressLine1?: string;
        addressLine2?: string;
        addressState?: string;
    };
    type ShippingDetails = {
        addressPostalCode?: string;
        addressCity?: string;
        addressCountry?: string;
        addressLine1?: string;
        addressLine2?: string;
        addressState?: string;
        name?: string;
    };
    interface Options {
    }
    interface BaseParams {
        billingDetails?: BillingDetails;
    }
    type CardParams = (BaseParams & {
        type: 'Card';
        token?: string;
        setupFutureUsage?: PaymentIntents.FutureUsage;
    }) | (BaseParams & {
        type: 'Card';
        paymentMethodId: string;
        cvc?: string;
    });
    interface IdealParams extends BaseParams {
        type: 'Ideal';
        bankName?: string;
        setupFutureUsage?: PaymentIntents.FutureUsage;
    }
    interface FPXParams {
        type: 'Fpx';
        testOfflineBank?: boolean;
    }
    interface AlipayParams {
        type: 'Alipay';
    }
    interface OxxoParams extends Required<BaseParams> {
        type: 'Oxxo';
    }
    interface SofortParams extends BaseParams {
        type: 'Sofort';
        country: string;
        setupFutureUsage?: PaymentIntents.FutureUsage;
    }
    interface GrabPayParams extends BaseParams {
        type: 'GrabPay';
    }
    interface BancontactParams extends Required<BaseParams> {
        type: 'Bancontact';
        setupFutureUsage?: PaymentIntents.FutureUsage;
    }
    interface SepaParams extends Required<BaseParams> {
        type: 'SepaDebit';
        iban: string;
        setupFutureUsage?: PaymentIntents.FutureUsage;
    }
    interface GiropayParams extends Required<BaseParams> {
        type: 'Giropay';
    }
    interface AfterpayClearpayParams extends Required<BaseParams> {
        type: 'AfterpayClearpay';
        shippingDetails: ShippingDetails;
    }
    interface EpsParams extends Required<BaseParams> {
        type: 'Eps';
    }
    interface P24Params extends Required<BaseParams> {
        type: 'P24';
    }
    interface WeChatPayParams extends BaseParams {
        type: 'WeChatPay';
        appId: string;
    }
    interface AuBecsDebitParams {
        type: 'AuBecsDebit';
        formDetails: AuBECSDebitFormComponent.FormDetails;
    }
}
export declare namespace PaymentMethods {
    interface BillingDetails {
        email?: string;
        phone?: string;
        name?: string;
        address?: Address;
    }
    interface Address {
        city: string;
        country: string;
        line1: string;
        line2: string;
        postal_code: string;
        state: string;
    }
    interface AuBecsDebit {
        fingerprint?: string;
        last4?: string;
        bsbNumber?: string;
    }
    interface BacsDebit {
        sortCode?: string;
        last4?: string;
        fingerprint?: string;
    }
    interface Card {
        brand?: Card.Brand;
        country?: string;
        exp_year?: number;
        exp_month?: number;
        fingerprint?: string;
        funding?: string;
        last4?: string;
    }
    interface Fpx {
        bank?: string;
    }
    interface Ideal {
        bankIdentifierCode?: string;
        bank?: string;
    }
    interface SepaDebit {
        bankCode?: string;
        country?: string;
        fingerprint?: string;
        last4?: string;
    }
    interface Sofort {
        country?: string;
    }
    interface Upi {
        vpa?: string;
    }
    type Types = 'AfterpayClearpay' | 'Card' | 'Alipay' | 'GrabPay' | 'Ideal' | 'Fpx' | 'CardPresent' | 'SepaDebit' | 'AuBecsDebit' | 'BacsDebit' | 'Giropay' | 'P24' | 'Eps' | 'Bancontact' | 'Oxxo' | 'Sofort' | 'Upi' | 'Unknown';
}
