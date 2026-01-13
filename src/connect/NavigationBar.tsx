import React, { forwardRef } from 'react';
import { processColor, type ViewProps } from 'react-native';
import NativeNavigationBar from '../specs/NativeNavigationBar';

export interface NavigationBarProps extends ViewProps {
  title?: string;
  textColor?: string;
  onCloseButtonPress?: () => void;
}

export const NavigationBar = forwardRef<any, NavigationBarProps>(
  ({ title, textColor, onCloseButtonPress, ...rest }, ref) => {
    const processedColor = textColor
      ? (processColor(textColor) as number | null | undefined)
      : undefined;

    return (
      <NativeNavigationBar
        ref={ref}
        title={title}
        textColorValue={processedColor ?? undefined}
        onCloseButtonPress={
          onCloseButtonPress
            ? (_event) => {
                onCloseButtonPress();
              }
            : undefined
        }
        {...rest}
      />
    );
  }
);

NavigationBar.displayName = 'NavigationBar';
