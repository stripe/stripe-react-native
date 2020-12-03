import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  title: string;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  loading?: boolean;
  onPress(): void;
};

export default function Button({
  title,
  variant = 'default',
  disabled,
  loading,
  onPress,
}: Props) {
  return (
    <View style={disabled && styles.disabled}>
      <TouchableOpacity
        style={[
          styles.container,
          variant === 'primary' && styles.primaryContainer,
        ]}
        onPress={onPress}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text
            style={[styles.text, variant === 'primary' && styles.textPrimary]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  primaryContainer: {
    backgroundColor: '#00695C',
    alignItems: 'center',
  },
  text: {
    color: '#212121',
    fontWeight: '600',
    fontSize: 16,
  },
  textPrimary: {
    color: '#FFF',
  },
  disabled: {
    opacity: 0.3,
  },
});
