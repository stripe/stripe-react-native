import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
export declare namespace AuBECSDebitFormComponent {
    /**
     * @ignore
     */
    interface NativeProps {
        companyName: string;
        style?: StyleProp<ViewStyle>;
        formStyle: Styles;
        onCompleteAction(value: NativeSyntheticEvent<FormDetails>): void;
    }
    interface FormDetails {
        accountNumber: string;
        bsbNumber: string;
        email: string;
        name: string;
    }
    interface Styles {
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
