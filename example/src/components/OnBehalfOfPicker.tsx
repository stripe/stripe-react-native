import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../colors';

export interface OnBehalfOfOption {
  label: string;
  value: string;
}

interface OnBehalfOfPickerProps {
  options: OnBehalfOfOption[];
  selectedValue: OnBehalfOfOption | null;
  onValueChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

const OnBehalfOfPicker: React.FC<OnBehalfOfPickerProps> = ({
  options,
  selectedValue,
  onValueChange,
  label = 'On Behalf Of',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Picker
        selectedValue={selectedValue}
        onValueChange={(itemValue) => {
          console.log('itemValue', itemValue);
          onValueChange(itemValue as string | null);
        }}
        style={styles.picker}
      >
        <Picker.Item label="No Connected Account" value={null} />
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate,
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: colors.slate,
    borderRadius: 4,
  },
});

export default OnBehalfOfPicker;
