import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { parseDollars, formatDollarsForInput } from '../utils/money';
import { Colors } from '../constants/colors';

interface AmountInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value?: number;
  onValueChange: (value: number | undefined) => void;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onValueChange,
  style,
  ...props
}) => {
  const [text, setText] = useState(
    value !== undefined ? formatDollarsForInput(value) : ''
  );

  // Update text when value prop changes externally
  useEffect(() => {
    setText(value !== undefined ? formatDollarsForInput(value) : '');
  }, [value]);

  const handleBlur = () => {
    const parsed = text ? parseDollars(text) : undefined;
    onValueChange(parsed);
    setText(parsed !== undefined ? formatDollarsForInput(parsed) : '');
  };

  return (
    <TextInput
      {...props}
      style={[styles.input, style]}
      value={text}
      onChangeText={setText}
      onBlur={handleBlur}
      keyboardType="decimal-pad"
      placeholder="0"
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
    fontSize: 17,
    color: Colors.text.primary,
    textAlign: 'right',
  },
});
