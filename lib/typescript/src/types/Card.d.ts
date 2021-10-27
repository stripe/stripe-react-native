export declare namespace Card {
    type Brand = 'AmericanExpress' | 'DinersClub' | 'Discover' | 'JCB' | 'MasterCard' | 'UnionPay' | 'Visa' | 'Unknown';
    type TokenType = 'Account' | 'BankAccount' | 'Card' | 'CvcUpdate' | 'Person' | 'Pii';
    interface Token {
        id: string;
        created: string;
        type: TokenType;
        used: boolean;
        livemode: boolean;
        card?: Params;
        bankAccount?: BankAccount;
    }
    interface BankAccount {
        bankName: string;
        accountHolderName: string;
        accountHolderType: 'Individual' | 'Company';
        currency: string;
        country: string;
        routingNumber: string;
        status: 'Errored' | 'New' | 'Validated' | 'VerificationFailed' | 'Verified';
    }
    interface Params {
        country: string;
        brand: Card.Brand;
        currency?: string;
        expMonth: number;
        expYear: number;
        last4: string;
        funding: 'Credit' | 'Debit' | 'Prepaid' | 'Unknown';
        address: Address;
        name?: string;
    }
    interface Address {
        city?: string;
        country?: string;
        line1?: string;
        line2?: string;
        postalCode?: string;
        state?: string;
    }
    interface CreateTokenParams {
        type: 'Account' | 'BankAccount' | 'Card' | 'CvcUpdate' | 'Person' | 'Pii';
        address?: Address;
        name?: string;
    }
}
