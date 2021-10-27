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
export declare namespace ThreeDSecure {
    interface Props extends IOS.Props, Android.Props {
    }
    enum NavigationBarStyle {
        default = 0,
        black = 1,
        blackTranslucent = 2
    }
    namespace IOS {
        interface Props {
            backgroundColor?: string;
            footer?: FooterProps;
        }
        interface NavigationBarProps {
            barStyle?: NavigationBarStyle;
            translucent?: boolean;
            barTintColor?: string;
        }
    }
    namespace Android {
        interface Props {
            accentColor?: string;
        }
        interface NavigationBarProps {
            statusBarColor?: string;
            backgroundColor?: string;
        }
    }
    interface NavigationBarProps extends IOS.NavigationBarProps, Android.NavigationBarProps {
        headerText?: string;
        buttonText?: string;
        textColor?: string;
        textFontSize?: number;
    }
    interface FooterProps {
        backgroundColor?: string;
        chevronColor?: string;
        headingTextColor?: string;
        textColor?: string;
    }
    interface LabelProps {
        headingTextColor?: string;
        textColor?: string;
        textFontSize?: number;
        headingFontSize?: number;
    }
    interface TextFieldProps {
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        textColor?: string;
        textFontSize?: number;
    }
    interface ButtonProps {
        backgroundColor?: string;
        borderRadius?: number;
        textColor?: string;
        textFontSize?: number;
    }
}
