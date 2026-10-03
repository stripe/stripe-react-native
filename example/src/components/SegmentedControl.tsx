import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button from './Button';

export interface SegmentedControlOption<Value extends string> {
  label: string;
  value: Value;
}

interface SegmentedControlProps<Value extends string> {
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}

export function SegmentedControl<Value extends string>({
  options,
  value,
  onValueChange,
}: SegmentedControlProps<Value>) {
  return (
    <View style={styles.row}>
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <View
            key={option.value}
            style={[styles.segment, index > 0 ? styles.segmentSpacing : null]}
          >
            <Button
              title={option.label}
              variant={selected ? 'primary' : 'default'}
              center
              onPress={() => onValueChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
  },
  segmentSpacing: {
    marginLeft: 8,
  },
});
