import React from 'react';

import { StyleProp, StyleSheet, ViewStyle, View } from 'react-native';
import NativeStripeContainer from '../specs/NativeStripeContainer';

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
    <NativeStripeContainer
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? true}
      style={styles.container}
    >
      <View style={styles.container} accessible={false}>
        {children}
      </View>
    </NativeStripeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
