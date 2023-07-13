import { requireNativeComponent } from 'react-native';
import type * as ApplePayButtonComponent from '../types/components/ApplePayButtonComponent';
const ApplePayButtonNative =
  requireNativeComponent<ApplePayButtonComponent.NativeProps>('ApplePayButton');
export default ApplePayButtonNative;
