import React from 'react';
import { AccessibilityProps } from 'react-native';
declare type Props = AccessibilityProps & {
    title?: string | React.ReactElement;
    variant?: 'default' | 'primary';
    disabled?: boolean;
    loading?: boolean;
    onPress(): void;
};
export default function Button({ title, variant, disabled, loading, onPress, ...props }: Props): JSX.Element;
export {};
