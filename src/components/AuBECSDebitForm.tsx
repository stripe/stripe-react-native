import React from 'react';
import {
  AccessibilityProps,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { AuBECSDebitFormComponent } from '../types';

const AuBECSDebitFormNative =
  requireNativeComponent<AuBECSDebitFormComponent.NativeProps>(
    'AuBECSDebitForm'
  );

/**
 *  BECS Debit Form Component Props
 */
export interface Props extends AccessibilityProps {
  companyName: string;
  onComplete(value: AuBECSDebitFormComponent.FormDetails): void;
  formStyle?: AuBECSDebitFormComponent.Styles;
  style?: StyleProp<ViewStyle>;
  testID?: string;
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
export function AuBECSDebitForm({
  onComplete,
  companyName,
  formStyle,
  ...props
}: Props) {
  return (
    <AuBECSDebitFormNative
      onCompleteAction={(value) => onComplete(value.nativeEvent)}
      companyName={companyName}
      formStyle={{ ...formStyle }}
      {...props}
    />
  );
}
