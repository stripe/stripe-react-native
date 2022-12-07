import { requireNativeComponent } from 'react-native';
import type { GooglePayButtonComponent } from '../types';
const GooglePayButtonNative =
  requireNativeComponent<GooglePayButtonComponent.NativeProps>(
    'GooglePayButton'
  );
export default GooglePayButtonNative;
