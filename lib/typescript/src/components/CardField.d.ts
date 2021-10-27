import type { CardFieldInput, Nullable } from '../types';
import React from 'react';
import { AccessibilityProps, StyleProp, ViewStyle } from 'react-native';
/**
 *  Card Field Component Props
 */
export interface Props extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    postalCodeEnabled?: boolean;
    cardStyle?: CardFieldInput.Styles;
    placeholder?: CardFieldInput.Placeholders;
    autofocus?: boolean;
    onCardChange?(card: CardFieldInput.Details): void;
    onBlur?(): void;
    onFocus?(focusedField: Nullable<CardFieldInput.Names>): void;
    testID?: string;
    /**
     * WARNING: If set to `true` the full card number will be returned in the `onCardChange` handler.
     * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
     * Make sure that you're not mistakenly logging or storing full card details!
     * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
     */
    dangerouslyGetFullCardDetails?: boolean;
}
/**
 *  Card Field Component
 *
 * @example
 * ```ts
 * <CardField
 *    postalCodeEnabled={false}
 *    onCardChange={(cardDetails) => {
 *    console.log('card details', cardDetails);
 *      setCard(cardDetails);
 *    }}
 *    style={{height: 50}}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export declare const CardField: React.ForwardRefExoticComponent<Props & React.RefAttributes<CardFieldInput.Methods>>;
