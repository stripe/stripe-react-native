import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export namespace AuBECSDebitFormComponent {
  /**
   * @ignore
   */
  export interface NativeProps {
    companyName: string;
    style?: StyleProp<ViewStyle>;
    formStyle: Styles;
    onCompleteAction(value: NativeSyntheticEvent<FormDetails>): void;
  }

  export interface FormDetails {
    accountNumber: string;
    bsbNumber: string;
    email: string;
    name: string;
  }

  export interface Styles {
    borderWidth?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    textColor?: string;
    fontSize?: number;
    placeholderColor?: string;
    textErrorColor?: string;
  }
}
