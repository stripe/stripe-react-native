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
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';
import NativeStripeSdkModule from './specs/NativeStripeSdkModule';
import NativeOnrampSdkModule from './specs/NativeOnrampSdkModule';
import { PaymentMethod } from './types';
import { UnsafeObject } from './specs/utils';
import { FinancialConnectionsEvent } from './types/FinancialConnections';
import { Result as ConfirmationTokenResult } from './types/ConfirmationToken';

const compatEventEmitter =
  Platform.OS === 'ios'
    ? new NativeEventEmitter(NativeStripeSdkModule as any)
    : DeviceEventEmitter;

// This is a temporary compat layer for event emitters on new arch.
// Versions before RN 0.80 crash sometimes when setting the event emitter callback.
// Move this back to the NativeStripeSdkModule spec once we drop support for RN < 0.80.
type Events = {
  onConfirmHandlerCallback: EventEmitter<{
    paymentMethod: UnsafeObject<PaymentMethod.Result>;
    shouldSavePaymentMethod: boolean;
  }>;
  onConfirmationTokenHandlerCallback: EventEmitter<{
    confirmationToken: UnsafeObject<ConfirmationTokenResult>;
  }>;
  onFinancialConnectionsEvent: EventEmitter<
    UnsafeObject<FinancialConnectionsEvent>
  >;
  onOrderTrackingCallback: EventEmitter<void>;
  onCustomerAdapterFetchPaymentMethodsCallback: EventEmitter<void>;
  onCustomerAdapterAttachPaymentMethodCallback: EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterDetachPaymentMethodCallback: EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterSetSelectedPaymentOptionCallback: EventEmitter<{
    paymentOption: string;
  }>;
  onCustomerAdapterFetchSelectedPaymentOptionCallback: EventEmitter<void>;
  onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback: EventEmitter<void>;
  onCustomerSessionProviderSetupIntentClientSecret: EventEmitter<void>;
  onCustomerSessionProviderCustomerSessionClientSecret: EventEmitter<void>;
  embeddedPaymentElementDidUpdateHeight: EventEmitter<UnsafeObject<any>>;
  embeddedPaymentElementWillPresent: EventEmitter<void>;
  embeddedPaymentElementDidUpdatePaymentOption: EventEmitter<UnsafeObject<any>>;
  embeddedPaymentElementFormSheetConfirmComplete: EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementRowSelectionImmediateAction: EventEmitter<void>;
  embeddedPaymentElementLoadingFailed: EventEmitter<UnsafeObject<any>>;
  embeddedPaymentElementUpdateComplete: EventEmitter<UnsafeObject<any>>;
  onCustomPaymentMethodConfirmHandlerCallback: EventEmitter<UnsafeObject<any>>;
};

export function addListener<EventT extends keyof Events>(
  event: EventT,
  handler: Parameters<Events[EventT]>[0]
): EventSubscription {
  return compatEventEmitter.addListener(event, handler);
}

const compatOnrampEventEmitter =
  // On new arch we use native module events. On old arch this doesn't exist
  // so use NativeEventEmitter on iOS and DeviceEventEmitter on Android.
  NativeOnrampSdkModule.onCheckoutClientSecretRequested == null
    ? Platform.OS === 'ios'
      ? new NativeEventEmitter(NativeOnrampSdkModule as any)
      : DeviceEventEmitter
    : null;

type OnrampEvents = 'onCheckoutClientSecretRequested';

export function addOnrampListener<EventT extends OnrampEvents>(
  event: EventT,
  handler: Parameters<(typeof NativeOnrampSdkModule)[EventT]>[0]
): EventSubscription {
  if (compatOnrampEventEmitter != null) {
    return compatOnrampEventEmitter.addListener(event, handler);
  }
  return NativeOnrampSdkModule[event](handler as any);
}
