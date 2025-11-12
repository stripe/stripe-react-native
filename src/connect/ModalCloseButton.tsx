import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const size = 36;
const color = '#333';
const bg = 'transparent';
const accessibilityLabel = 'Close';

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

interface ModalCloseButtonProps {
  onPress: () => void;
}

export default function ModalCloseButton({ onPress }: ModalCloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.cross, { color, fontSize: Math.round(size * 0.6) }]}>
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
