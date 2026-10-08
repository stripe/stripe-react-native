import React, { forwardRef } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import NativeNavigationBar from '../specs/NativeNavigationBar';

export interface NavigationBarProps extends ViewProps {
  title?: string;
  /** Android: background of the bar. Defaults to white. */
  toolbarBackgroundColor?: ColorValue;
  /** Android: color of the title and the close icon. Defaults to black. */
  toolbarContentColor?: ColorValue;
  onCloseButtonPress?: () => void;
}

export const NavigationBar = forwardRef<any, NavigationBarProps>(
  ({ title, onCloseButtonPress, ...rest }, ref) => {
    return (
      <NativeNavigationBar
        ref={ref}
        title={title}
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
