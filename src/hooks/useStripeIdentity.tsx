import { useCallback, useRef, useState } from 'react';
import {
  identityVerificationFailure,
  presentIdentityVerificationSheet,
} from '../identity/functions';
import type {
  IdentityVerificationSheetOptions,
  IdentityVerificationSheetResult,
} from '../types/Identity';

/**
 * Presents Stripe Identity using credentials fetched by optionsProvider.
 * `loading` remains true while fetching credentials and presenting the sheet.
 * Credential and presentation failures are available through `status` and `error`.
 */
export function useStripeIdentity(
  optionsProvider: () => Promise<IdentityVerificationSheetOptions>
) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentityVerificationSheetResult>();
  const presenting = useRef(false);

  const present = useCallback(async () => {
    if (presenting.current) {
      return;
    }
    presenting.current = true;
    setLoading(true);
    setResult(undefined);
    try {
      const options = await optionsProvider();
      setResult(await presentIdentityVerificationSheet(options));
    } catch (error) {
      setResult(identityVerificationFailure(error));
    } finally {
      presenting.current = false;
      setLoading(false);
    }
  }, [optionsProvider]);

  return { present, status: result?.status, loading, error: result?.error };
}
