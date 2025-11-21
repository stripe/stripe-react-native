import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const size = 36;
const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

interface ModalCloseButtonProps {
  onPress: () => void;
}

export default function ModalCloseButton({ onPress }: ModalCloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={hitSlop}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.cross, { fontSize: Math.round(size * 0.6) }]}>
        ×
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    lineHeight: undefined,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
