import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useAppThemeColors } from '../utils/theme';

type OptionType = {
  title: string;
  value: boolean;
  onChange(value: boolean): void;
};

export function Option({ title, value, onChange }: OptionType) {
  const colors = useAppThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
  },
});
