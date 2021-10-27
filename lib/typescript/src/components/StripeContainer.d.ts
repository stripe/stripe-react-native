import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
/**
 *  Stripe Container Component Props
 */
export interface Props {
    children: React.ReactElement | React.ReactElement[];
    keyboardShouldPersistTaps?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}
/**
 *  StripeContainer Component
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export declare function StripeContainer({ keyboardShouldPersistTaps, children, }: Props): JSX.Element;
