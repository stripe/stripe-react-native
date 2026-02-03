import React, { forwardRef } from 'react';
import type { ViewProps } from 'react-native';
import NativeNavigationBar from '../specs/NativeNavigationBar';

/**
 * Props for the NavigationBar component.
 */
export interface NavigationBarProps extends ViewProps {
  /** Title text to display in the center of the navigation bar. */
  title?: string;
  /** Callback fired when the close button is pressed. */
  onCloseButtonPress?: () => void;
}

/**
 * A customizable navigation bar for Connect modal flows.
 * Displays a title and optional close button, with platform-specific styling.
 *
 * @param props.title - Title text to display
 * @param props.onCloseButtonPress - Callback when close button is pressed
 *
 * @example
 * ```tsx
 * <NavigationBar
 *   title="Account Setup"
 *   onCloseButtonPress={() => navigation.goBack()}
 * />
 * ```
 * @category Connect
 */
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
