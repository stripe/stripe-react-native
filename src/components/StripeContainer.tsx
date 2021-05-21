import React from 'react';

import { requireNativeComponent, StyleProp, ViewStyle } from 'react-native';

const StripeContainerNative = requireNativeComponent<any>('StripeContainer');

/**
 *  Stripe Container Component Props
 */
export interface Props {
  children: React.ReactElement | React.ReactElement[];
  style?: StyleProp<ViewStyle>;
}

/**
 *  StripeContainer Component
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function StripeContainer({ style, children }: Props) {
  return (
    <StripeContainerNative style={style}>{children}</StripeContainerNative>
  );
}
