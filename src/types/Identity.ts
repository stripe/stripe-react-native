import type { ImageResolvedAssetSource } from 'react-native';
import type { StripeError } from './Errors';

/** Options for presenting Stripe Identity's verification sheet. */
export type IdentityVerificationSheetOptions = {
  /** The VerificationSession ID created by your server. */
  sessionId: string;
  /** The short-lived ephemeral key secret created by your server. */
  ephemeralKeySecret: string;
  /** Your brand logo, resolved with `Image.resolveAssetSource`. */
  brandLogo: ImageResolvedAssetSource;
};

/** Completing the flow does not mean the user's identity has been verified. */
export type IdentityVerificationSheetStatus =
  | 'FlowCompleted'
  | 'FlowCanceled'
  | 'FlowFailed';

export type IdentityVerificationSheetResult = {
  status: IdentityVerificationSheetStatus;
  error?: StripeError<IdentityVerificationSheetStatus>;
};
