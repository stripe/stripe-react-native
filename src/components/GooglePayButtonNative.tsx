import { requireNativeComponent } from 'react-native';
import type * as GooglePayButtonComponent from '../types/components/GooglePayButtonComponent';
const GooglePayButtonNative =
  requireNativeComponent<GooglePayButtonComponent.NativeProps>(
    'GooglePayButton'
  );
export default GooglePayButtonNative;
