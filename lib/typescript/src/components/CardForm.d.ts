import type { CardFormView } from '../types';
import React from 'react';
import { AccessibilityProps, StyleProp, ViewStyle } from 'react-native';
/**
 *  Card Form Component Props
 */
export interface Props extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    autofocus?: boolean;
    testID?: string;
    cardStyle?: CardFormView.Styles;
    onFormComplete?(card: CardFormView.Details): void;
    /**
     * WARNING: If set to `true` the full card number will be returned in the `onFormComplete` handler.
     * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
     * Make sure that you're not mistakenly logging or storing full card details!
     * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
     */
    dangerouslyGetFullCardDetails?: boolean;
}
/**
 *  Card Form Component
 *
 * @example
 * ```ts
 * <CardForm
 *    onFormComplete={(cardDetails) => {
 *    console.log('card details', cardDetails);
 *      setCard(cardDetails);
 *    }}
 *    style={{height: 200}}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export declare const CardForm: React.ForwardRefExoticComponent<Props & React.RefAttributes<CardFormView.Methods>>;
