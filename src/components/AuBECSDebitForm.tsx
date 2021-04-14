import React from 'react';
import {
  AccessibilityProps,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { AuBECSDebitFormComponent } from '../types';

const AuBECSDebitFormNative = requireNativeComponent<
  AuBECSDebitFormComponent.NativeProps
>('AuBECSDebitForm');

/**
 *  BECS Debit Form Component Props
 */
export interface Props extends AccessibilityProps {
  companyName: string;
  onComplete(value: AuBECSDebitFormComponent.FormDetails): void;
  style?: StyleProp<ViewStyle>;
}

/**
 *  BECS Debit form component
 *
 * @example
 * ```ts
 *  <AuBECSDebitForm
 *    companyName="Example Company Inc."
 *    onComplete={value => onComplete(value)}
 *    style={{ width: '100%', height: 500 }}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function AuBECSDebitForm({ companyName, onComplete, ...props }: Props) {
  return (
    <AuBECSDebitFormNative
      onCompleteAction={(value) => {
        console.log('value', value.nativeEvent);
        onComplete(value.nativeEvent);
      }}
      companyName={companyName}
      {...props}
    />
  );
}
