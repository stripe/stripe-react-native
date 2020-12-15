import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../colors';

const Screen: React.FC = ({ children }) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
});

export default Screen;
