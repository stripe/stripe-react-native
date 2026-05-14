import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  DirectEventHandler,
  Double,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface HeightChangeEvent {
  height: Double;
}

export interface NativeProps extends ViewProps {
  /**
   * Opaque key returned by `useCheckout`. The native side uses this to look
   * up the matching `Checkout` instance and observe its state — there's no
   * separate session-update event from this view, since `useCheckout`
   * already subscribes to a single `checkoutSessionDidChangeState` channel
   * that mirrors every native-driven mutation back into JS.
   */
  sessionKey: string;

  /** When true, the toggle is visible but ignores user interaction. */
  disabled?: WithDefault<boolean, false>;

  /**
   * Fired whenever the element's intrinsic height changes so the RN
   * layout system can update the containing view.
   */
  onHeightChange?: DirectEventHandler<HeightChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'StripeCurrencySelectorElement'
) as HostComponent<NativeProps>;
