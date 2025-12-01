import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { AnimatedCheckmark } from './AnimatedCheckmark';
import { Colors } from '../constants/colors';

interface SelectableRowProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectableRow: React.FC<SelectableRowProps> = ({
  title,
  subtitle,
  selected,
  onPress,
}) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <AnimatedCheckmark visible={selected} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
