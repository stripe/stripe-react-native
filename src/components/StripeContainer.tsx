import React from 'react';

import {
  requireNativeComponent,
  StyleProp,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';

const StripeContainerNative = requireNativeComponent<any>('StripeContainer');

/**
 *  Stripe Container Component Props
 */
export interface Props {
  children: React.ReactElement | React.ReactElement[];
  keyboardShouldPersistTaps?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 *  StripeContainer Component
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function StripeContainer({
  keyboardShouldPersistTaps,
  children,
}: Props) {
  return (
    <StripeContainerNative
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      style={styles.container}
    >
      <View style={styles.container} accessible={false}>
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
