import { Platform } from 'react-native';

export const isiOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function createHandler<T>(callback: (value: T) => void) {
  return isiOS
    ? (_: any, value: T) => {
        callback(value);
      }
    : (value: T) => {
        callback(value);
      };
}
