import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface ChevronRightProps {
  size?: number;
}

export const ChevronRight: React.FC<ChevronRightProps> = ({ size = 20 }) => {
  return <Text style={[styles.chevron, { fontSize: size }]}>›</Text>;
};

const styles = StyleSheet.create({
  chevron: {
    color: Colors.icon.secondary,
  },
});
