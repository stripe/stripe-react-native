import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { Nullable } from '..';
import type { Card } from '../Card';
export declare namespace CardFormView {
    type Names = 'CardNumber' | 'Cvc' | 'ExpiryDate' | 'PostalCode';
    interface Details {
        last4: string;
        expiryMonth: number;
        expiryYear: number;
        postalCode?: string;
        brand: Card.Brand;
        complete: boolean;
        country: string;
        /**
         * WARNING: Full card details are only returned when the `dangerouslyGetFullCardDetails` prop
         * on the `CardField` component is set to `true`.
         * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
         * Make sure that you're not mistakenly logging or storing full card details!
         * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
         */
        number?: string;
    }
    interface Styles {
        backgroundColor?: string;
    }
    interface Placeholders {
        number?: string;
        expiration?: string;
        cvc?: string;
        postalCode?: string;
    }
    /**
     * @ignore
     */
    interface NativeProps {
        style?: StyleProp<ViewStyle>;
        autofocus?: boolean;
        cardStyle?: Styles;
        onFocusChange(event: NativeSyntheticEvent<{
            focusedField: Nullable<Names>;
        }>): void;
        onFormComplete(event: NativeSyntheticEvent<Details>): void;
    }
    interface Methods {
        focus(): void;
        blur(): void;
    }
}
