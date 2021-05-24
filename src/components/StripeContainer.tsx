import React, { useRef } from 'react';

import {
  requireNativeComponent,
  StyleProp,
  StyleSheet,
  ViewStyle,
  View,
  UIManager,
} from 'react-native';
import ReactNative from 'react-native';

const StripeContainerNative = requireNativeComponent<any>('StripeContainer');

/**
 *  Stripe Container Component Props
 */
export interface Props {
  children: React.ReactElement | React.ReactElement[];
  keyboardShouldPersistTaps?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 *  StripeContainer Component
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function StripeContainer({ children }: Props) {
  const ref = useRef<any>();

  function onBlur() {
    UIManager.dispatchViewManagerCommand(
      ReactNative.findNodeHandle(ref.current),
      (UIManager as any).StripeContainer.Commands.updateFromManager,
      []
    );
  }

  return (
    <StripeContainerNative ref={ref} style={styles.container}>
      <View
        onStartShouldSetResponder={(evt) => {
          evt.persist();
          if (
            ((evt as unknown) as any)?.viewConfig.uiViewClassName !==
            'CardField'
          ) {
            onBlur();
          }
          return false;
        }}
        style={styles.container}
        accessible={false}
      >
        {children}
      </View>
    </StripeContainerNative>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
