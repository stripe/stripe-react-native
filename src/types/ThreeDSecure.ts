export interface ConfigurationParams extends Props {
  timeout?: number;
  label?: LabelProps;
  navigationBar?: NavigationBarProps;
  textField?: TextFieldProps;
  submitButton?: ButtonProps;
  cancelButton?: ButtonProps;
  continueButton?: ButtonProps;
  nextButton?: ButtonProps;
  resendButton?: ButtonProps;
}

export interface Props extends IOSProps, AndroidProps {}

export enum NavigationBarStyle {
  default = 0,
  black = 1,
  blackTranslucent = 2,
}

export interface IOSProps {
  backgroundColor?: string;
  footer?: FooterProps;
}
export interface IOSNavigationBarProps {
  barStyle?: NavigationBarStyle;
  translucent?: boolean;
  barTintColor?: string;
}

export interface AndroidProps {
  accentColor?: string;
}
export interface AndroidNavigationBarProps {
  statusBarColor?: string;
  backgroundColor?: string;
}

export interface NavigationBarProps
  extends IOSNavigationBarProps,
    AndroidNavigationBarProps {
  headerText?: string;
  buttonText?: string;
  textColor?: string;
  textFontSize?: number;
}

export interface FooterProps {
  backgroundColor?: string;
  chevronColor?: string;
  headingTextColor?: string;
  textColor?: string;
}

export interface LabelProps {
  headingTextColor?: string;
  textColor?: string;
  textFontSize?: number;
  headingFontSize?: number;
}

export interface TextFieldProps {
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  textFontSize?: number;
}

export interface ButtonProps {
  backgroundColor?: string;
  borderRadius?: number;
  textColor?: string;
  textFontSize?: number;
}
