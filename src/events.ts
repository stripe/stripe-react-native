/**
 * Compatibility helper to use new arch events if available and fallback
 * to NativeEventEmitter or DeviceEventEmitter.
 *
 * Can be removed once we no longer need to support the old arch and use
 * the methods on NativeStripeSdkModule directly.
 */

import {
  DeviceEventEmitter,
  EventSubscription,
  NativeEventEmitter,
  Platform,
} from 'react-native';
import NativeStripeSdkModule from './specs/NativeStripeSdkModule';

const compatEventEmitter =
  // On new arch we use native module events. On old arch this doesn't exist
  // so use NativeEventEmitter on iOS and DeviceEventEmitter on Android.
  NativeStripeSdkModule.onConfirmHandlerCallback == null
    ? Platform.OS === 'ios'
      ? new NativeEventEmitter(NativeStripeSdkModule as any)
      : DeviceEventEmitter
    : null;

type Events =
  | 'onConfirmHandlerCallback'
  | 'onFinancialConnectionsEvent'
  | 'onOrderTrackingCallback'
  | 'onCustomerAdapterFetchPaymentMethodsCallback'
  | 'onCustomerAdapterAttachPaymentMethodCallback'
  | 'onCustomerAdapterDetachPaymentMethodCallback'
  | 'onCustomerAdapterSetSelectedPaymentOptionCallback'
  | 'onCustomerAdapterFetchSelectedPaymentOptionCallback'
  | 'onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback'
  | 'embeddedPaymentElementFormSheetConfirmComplete'
  | 'embeddedPaymentElementRowSelectionImmediateAction'
  | 'embeddedPaymentElementDidUpdatePaymentOption'
  | 'embeddedPaymentElementDidUpdateHeight'
  | 'embeddedPaymentElementLoadingFailed'
  | 'onCustomPaymentMethodConfirmHandlerCallback';

export function addListener<EventT extends Events>(
  event: EventT,
  handler: Parameters<(typeof NativeStripeSdkModule)[EventT]>[0]
): EventSubscription {
  if (compatEventEmitter != null) {
    return compatEventEmitter.addListener(event, handler);
  }
  return NativeStripeSdkModule[event](handler as any);
}
