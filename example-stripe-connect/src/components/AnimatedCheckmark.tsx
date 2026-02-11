import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Colors } from '../constants/colors';

interface AnimatedCheckmarkProps {
  visible: boolean;
  style?: StyleProp<TextStyle>;
}

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  visible,
  style,
}) => {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.Text style={[styles.checkmark, style, { opacity }]}>
      ✓
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  checkmark: {
    fontSize: 20,
    color: Colors.component.checkmarkActive,
  },
});
