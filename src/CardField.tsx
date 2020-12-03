import React, { useCallback } from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { CardDetails, CardFieldProps, Nullable } from './types';

const CardFieldNative = requireNativeComponent<CardFieldProps>('CardField');

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  defaultValue?: Partial<CardDetails>;
  postalCodeEnabled?: boolean;
  onCardChange?(card: CardDetails): void;
  onFocus?(focusedField: Nullable<string>): void;
};

export const CardField: React.FC<Props> = ({
  onCardChange,
  onFocus,
  ...props
}) => {
  const onCardChangeHandler = useCallback(
    (event: NativeSyntheticEvent<CardDetails>) => {
      onCardChange?.(event.nativeEvent);
    },
    [onCardChange]
  );

  const onFocusHandler = useCallback(
    (event: NativeSyntheticEvent<{ focusedField: Nullable<string> }>) => {
      onFocus?.(event.nativeEvent.focusedField);
    },
    [onFocus]
  );

  return (
    <CardFieldNative
      onCardChange={onCardChangeHandler}
      onFocus={onFocusHandler}
      {...props}
    />
  );
};
