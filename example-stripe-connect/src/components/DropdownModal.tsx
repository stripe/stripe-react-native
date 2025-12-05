import React from 'react';
import { View } from 'react-native';
import { MenuView } from '@react-native-menu/menu';

export interface DropdownOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <MenuView
      onPressAction={({ nativeEvent }) => {
        onSelect(nativeEvent.event);
      }}
      actions={options.map((option) => ({
        id: option.value,
        title: option.label,
        subtitle: option.subtitle,
        state: selectedValue === option.value ? 'on' : 'off',
      }))}
    >
      <View>{trigger}</View>
    </MenuView>
  );
};
