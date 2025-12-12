import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export const Separator: React.FC = () => {
  return <View style={styles.separator} />;
};

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border.default,
    marginHorizontal: 16,
  },
});
