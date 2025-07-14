import { Platform } from 'react-native';

// Address to stripe server running on local machine
const LOCAL_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4242' : 'http://localhost:4242';
// Heres a link to a codesandbox you can fork and edit for yourself https://codesandbox.io/p/devbox/rigorous-heartbreaking-cephalopod-m358cz;
const DEMO_BACKEND_URL =
  'https://rigorous-heartbreaking-cephalopod.stripedemos.com';

export const API_URL = __DEV__ ? LOCAL_URL : DEMO_BACKEND_URL;
