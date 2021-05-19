export interface ThreeDSecureConfigurationParams extends ThreeDSecure.Props {
  timeout?: number;
  label?: ThreeDSecure.LabelProps;
  navigationBar?: ThreeDSecure.NavigationBarProps;
  textField?: ThreeDSecure.TextFieldProps;
  submitButton?: ThreeDSecure.ButtonProps;
  cancelButton?: ThreeDSecure.ButtonProps;
  continueButton?: ThreeDSecure.ButtonProps;
  nextButton?: ThreeDSecure.ButtonProps;
  resendButton?: ThreeDSecure.ButtonProps;
}

export namespace ThreeDSecure {
  export interface Props extends IOS.Props, Android.Props {}

  export enum NavigationBarStyle {
    default = 0,
    black = 1,
    blackTranslucent = 2,
  }

  export namespace IOS {
    export interface Props {
      backgroundColor?: string;
      footer?: FooterProps;
    }
    export interface NavigationBarProps {
      barStyle?: NavigationBarStyle;
      translucent?: boolean;
      barTintColor?: string;
    }
  }

  export namespace Android {
    export interface Props {
      accentColor?: string;
    }
    export interface NavigationBarProps {
      statusBarColor?: string;
      backgroundColor?: string;
    }
  }

  export interface NavigationBarProps
    extends IOS.NavigationBarProps,
      Android.NavigationBarProps {
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
}
