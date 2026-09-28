import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import type {
  IdentityVerificationSheetOptions,
  IdentityVerificationSheetResult,
} from '../types/Identity';

export function identityVerificationFailure(
  error: unknown
): IdentityVerificationSheetResult {
  return {
    status: 'FlowFailed',
    error: {
      code: 'FlowFailed',
      message:
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Identity verification failed.',
    },
  };
}

/**
 * Presents the Identity verification sheet. No StripeProvider or initStripe call
 * is required. Create the VerificationSession and ephemeral key on your server.
 * Use server-side verification results to determine whether identity is verified.
 */
export async function presentIdentityVerificationSheet(
  options: IdentityVerificationSheetOptions
): Promise<IdentityVerificationSheetResult> {
  try {
    return await NativeStripeSdk.presentIdentityVerificationSheet(options);
  } catch (error) {
    return identityVerificationFailure(error);
  }
}
