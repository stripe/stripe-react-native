import { Platform } from 'react-native';

// Address to stripe server running on local machine
export const API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4242' : 'http://localhost:4242';
