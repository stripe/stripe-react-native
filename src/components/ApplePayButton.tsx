import React from 'react';
import {
  AccessibilityProps,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { ApplePayButtonProps } from '../types';

const ApplePayButtonNative = requireNativeComponent<ApplePayButtonProps>(
  'ApplePayButton'
);

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  onPress(): void;
};

export const ApplePayButton: React.FC<Props> = ({ onPress, ...props }) => {
  return <ApplePayButtonNative onPay={onPress} {...props} />;
};
