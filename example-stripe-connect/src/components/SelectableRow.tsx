import React from 'react';
import { Pressable, Text, View, StyleSheet, Switch } from 'react-native';
import { AnimatedCheckmark } from './AnimatedCheckmark';
import { Colors } from '../constants/colors';

interface SelectableRowProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  showCheckmark?: boolean;
  showToggle?: boolean;
}

export const SelectableRow: React.FC<SelectableRowProps> = ({
  title,
  subtitle,
  selected,
  onPress,
  showCheckmark = true,
  showToggle = false,
}) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {showToggle ? (
        <Switch value={selected} onValueChange={onPress} />
      ) : showCheckmark ? (
        <AnimatedCheckmark visible={selected} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
    backgroundColor: Colors.background.primary,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
