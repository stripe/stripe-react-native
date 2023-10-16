import type { StyleProp, ViewStyle } from 'react-native';
export interface NativeProps {
  style?: StyleProp<ViewStyle>;
  type?: number;
  appearance?: number;
  borderRadius?: number;
}
