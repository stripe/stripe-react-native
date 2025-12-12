import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface SectionHeaderProps {
  children: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ children }) => {
  return <Text style={styles.sectionHeader}>{children}</Text>;
};

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 8,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
  },
});
