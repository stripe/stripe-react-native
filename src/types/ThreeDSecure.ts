declare module '@stripe/stripe-react-native' {
  export interface ThreeDSecureConfigurationParams extends ThreeDSecure.Props {
    timeout?: number;
    label?: ThreeDSecure.LabelProps;
    navigationBar?: ThreeDSecure.NavigationBarProps;
    textField?: ThreeDSecure.TextFieldProps;
    submitButton?: ThreeDSecure.SubmitButtonProps;
  }

  namespace ThreeDSecure {
    export interface Props extends IOS.Props, Android.Props {}

    export enum NavigationBarStyle {
      default = 0,
      black = 1,
      blackTranslucent = 2,
    }

    namespace IOS {
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

    namespace Android {
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
      cornerRadius?: number;
      textColor?: string;
      textFontSize?: number;
    }

    export interface SubmitButtonProps {
      backgroundColor?: string;
      cornerRadius?: number;
      textColor?: string;
      textFontSize?: number;
    }
  }
}
