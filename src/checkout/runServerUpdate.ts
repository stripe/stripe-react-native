import { addListener } from '../events';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import { createCheckoutBridgeId } from './CheckoutControllerEventEmitter';

/** Runs the merchant callback when native is ready to update this session. */
export async function runServerUpdate(
  controllerId: string,
  serverUpdate: () => Promise<void>
): Promise<void> {
  const operationId = createCheckoutBridgeId();
  let active = true;
  let requested = false;
  let rejectCompletion!: (error: unknown) => void;
  const completionFailure = new Promise<never>((_, reject) => {
    rejectCompletion = reject;
  });
  const complete = async (error: string | null) => {
    if (active) {
      await NativeStripeSdk.completeCheckoutServerUpdate(
        controllerId,
        operationId,
        error
      );
    }
  };
  const subscription = addListener('checkoutServerUpdateRequested', (event) => {
    if (
      !active ||
      event.controllerId !== controllerId ||
      event.operationId !== operationId ||
      requested
    ) {
      return;
    }
    requested = true;
    Promise.resolve()
      .then(serverUpdate)
      .then(
        () => complete(null),
        (error: unknown) =>
          complete(error instanceof Error ? error.message : String(error))
      )
      .catch(rejectCompletion);
  });
  try {
    await Promise.race([
      NativeStripeSdk.runCheckoutServerUpdate(controllerId, operationId),
      completionFailure,
    ]);
  } finally {
    active = false;
    subscription.remove();
  }
}
