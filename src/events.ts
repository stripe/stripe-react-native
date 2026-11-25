/**
 * Compatibility helper for new architecture events using NativeEventEmitter
 * or DeviceEventEmitter on React Native versions before 0.80.
 *
 * Can be removed once we no longer need to support React Native < 0.80 and use
 * the methods on NativeStripeSdkModule directly.
 */

import {
  type CodegenTypes,
  DeviceEventEmitter,
  EventSubscription,
  NativeEventEmitter,
  Platform,
} from 'react-native';
import NativeStripeSdkModule from './specs/NativeStripeSdkModule';
import NativeOnrampSdkModule from './specs/NativeOnrampSdkModule';
import { PaymentMethod } from './types';
import { UnsafeObject } from './specs/utils';
import { FinancialConnectionsEvent } from './types/FinancialConnections';
import { Result as ConfirmationTokenResult } from './types/ConfirmationToken';
import type { CheckoutElements } from './types/CheckoutElements';
import type { CheckoutControllerUpdate } from './checkout/CheckoutControllerEventEmitter';

// NativeEventEmitter and DeviceEventEmitter have addListener signatures that
// can't be called through their union type, so use the shared shape.
type CompatEventEmitter = {
  addListener(
    eventType: string,
    listener: (...args: any[]) => unknown
  ): EventSubscription;
};

const compatEventEmitter: CompatEventEmitter =
  Platform.OS === 'ios'
    ? new NativeEventEmitter(NativeStripeSdkModule as any)
    : DeviceEventEmitter;

// This is a temporary compat layer for event emitters on new arch.
// Versions before RN 0.80 crash sometimes when setting the event emitter callback.
// Move this back to the NativeStripeSdkModule spec once we drop support for RN < 0.80.
type Events = {
  checkoutExpressCheckoutDidComplete: CodegenTypes.EventEmitter<
    UnsafeObject<{ controllerId: string; result: CheckoutElements.Result }>
  >;
  checkoutServerUpdateRequested: CodegenTypes.EventEmitter<{
    controllerId: string;
    operationId: string;
  }>;
  onConfirmHandlerCallback: CodegenTypes.EventEmitter<{
    paymentMethod: UnsafeObject<PaymentMethod.Result>;
    shouldSavePaymentMethod: boolean;
  }>;
  onConfirmationTokenHandlerCallback: CodegenTypes.EventEmitter<{
    confirmationToken: UnsafeObject<ConfirmationTokenResult>;
  }>;
  onFinancialConnectionsEvent: CodegenTypes.EventEmitter<
    UnsafeObject<FinancialConnectionsEvent>
  >;
  onOrderTrackingCallback: CodegenTypes.EventEmitter<void>;
  onCustomerAdapterFetchPaymentMethodsCallback: CodegenTypes.EventEmitter<void>;
  onCustomerAdapterAttachPaymentMethodCallback: CodegenTypes.EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterDetachPaymentMethodCallback: CodegenTypes.EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterSetSelectedPaymentOptionCallback: CodegenTypes.EventEmitter<{
    paymentOption: string;
  }>;
  onCustomerAdapterFetchSelectedPaymentOptionCallback: CodegenTypes.EventEmitter<void>;
  onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback: CodegenTypes.EventEmitter<void>;
  onCustomerSessionProviderSetupIntentClientSecret: CodegenTypes.EventEmitter<void>;
  onCustomerSessionProviderCustomerSessionClientSecret: CodegenTypes.EventEmitter<{
    requestId: string;
  }>;
  embeddedPaymentElementDidUpdateHeight: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementWillPresent: CodegenTypes.EventEmitter<void>;
  embeddedPaymentElementDidUpdatePaymentOption: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementFormSheetConfirmComplete: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementRowSelectionImmediateAction: CodegenTypes.EventEmitter<void>;
  embeddedPaymentElementLoadingFailed: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementUpdateComplete: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  onCustomPaymentMethodConfirmHandlerCallback: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  paymentMethodMessagingElementDidUpdateHeight: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  paymentMethodMessagingElementConfigureResult: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  checkoutControllerDidUpdate: CodegenTypes.EventEmitter<
    UnsafeObject<CheckoutControllerUpdate>
  >;
  checkoutControllerDidSelectPaymentOption: CodegenTypes.EventEmitter<{
    controllerId: CheckoutControllerUpdate['controllerId'];
  }>;
};

export function addListener<EventT extends keyof Events>(
  event: EventT,
  handler: Parameters<Events[EventT]>[0]
): EventSubscription {
  return compatEventEmitter.addListener(event, handler);
}

const compatOnrampEventEmitter: CompatEventEmitter | null =
  NativeOnrampSdkModule == null
    ? null
    : Platform.OS === 'ios'
      ? new NativeEventEmitter(NativeOnrampSdkModule as any)
      : DeviceEventEmitter;

type OnrampEventMap = {
  onCheckoutClientSecretRequested: void;
};

type OnrampEvents = keyof OnrampEventMap;

export function addOnrampListener<EventT extends OnrampEvents>(
  event: EventT,
  handler: (params: OnrampEventMap[EventT]) => void
): EventSubscription {
  if (compatOnrampEventEmitter == null) {
    // Return a no-op subscription when module is not available
    return { remove: () => {} } as EventSubscription;
  }
  return compatOnrampEventEmitter.addListener(event, handler);
}
