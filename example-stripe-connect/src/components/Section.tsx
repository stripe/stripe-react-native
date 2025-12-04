import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface SectionProps {
  children: ReactNode;
}

export const Section: React.FC<SectionProps> = ({ children }) => {
  return <View style={styles.section}>{children}</View>;
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border.default,
  },
});
