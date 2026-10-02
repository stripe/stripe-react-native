import type { IntentCreationCallbackParams } from '../types/PaymentSheet';

type NativeIntentCreationResult = IntentCreationCallbackParams & {
  requestId?: string;
};

/** @internal */
export function createIntentCreationCallback(
  nativeCallback: (result: NativeIntentCreationResult) => Promise<void>,
  requestId?: string
): (result: IntentCreationCallbackParams) => Promise<void> {
  // iOS and older native implementations do not attach a request identifier.
  if (requestId === undefined) {
    return nativeCallback;
  }
  return (result) => nativeCallback({ ...result, requestId });
}
