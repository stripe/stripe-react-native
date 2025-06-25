import { Platform } from 'react-native';

// Address to stripe server running on local machine
const LOCAL_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4242' : 'http://localhost:4242';
// Address to stripe server running on CodeSandBox
const CODESANDBOX_URL = 'https://m358cz-3000.csb.app';

export const API_URL = __DEV__ ? LOCAL_URL : CODESANDBOX_URL;
