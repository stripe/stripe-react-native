import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export namespace AuBECSDebitFormComponent {
  export interface NativeProps {
    companyName: string;
    style?: StyleProp<ViewStyle>;
    onCompleteAction(value: NativeSyntheticEvent<FormDetails>): void;
  }

  export interface FormDetails {
    accountNumber: string;
    bsbNumber: string;
    email: string;
    name: string;
  }
}
