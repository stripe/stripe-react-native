import { useState, useEffect, useCallback, useRef } from 'react';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import type { Checkout } from '../types/Checkout';

/**
 * Initializes a Stripe Checkout Session and returns a reactive handle.
 *
 * The session is fetched from Stripe when the hook mounts. `state` is `null`
 * until the initial load completes, then transitions between `loaded` and
 * `loading` as mutations are performed.
 *
 * Pass the returned `checkout` to `initPaymentSheet` to complete the purchase.
 *
 * @internal
 */
export function useCheckout(
  clientSecret: string,
  configuration?: Checkout.Configuration
): {
  /** The current loading state of the checkout session. `null` until the initial load completes. */
  state: Checkout.State | null;
  /** A handle to the session with methods for mutations. */
  checkout: Checkout;
  /** Set if the initial session load fails. Undefined otherwise. */
  error?: Checkout.Error;
} {
  const [state, setState] = useState<Checkout.State | null>(null);
  const [error, setError] = useState<Checkout.Error | undefined>(undefined);

  // Ref so mutation callbacks don't need it as a dependency.
  const sessionKeyRef = useRef<string | null>(null);

  // Load session on mount / clientSecret change.
  useEffect(() => {
    let cancelled = false;
    sessionKeyRef.current = null;
    setState(null);
    setError(undefined);

    (async () => {
      try {
        const result = await NativeStripeSdk.initCheckoutSession(
          clientSecret,
          configuration ?? {}
        );
        if (cancelled) return;
        sessionKeyRef.current = result.sessionKey;
        setState(result.state);
      } catch (e: any) {
        if (cancelled) return;
        setError({
          code: e.code ?? 'Failed',
          message: e.message ?? 'Failed to initialize checkout session',
        });
      }
    })();

    // Ignore in-flight init if unmounted or clientSecret changed.
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  // Sets `loading`, calls native, applies returned state. Reverts on error.
  const withLoading = useCallback(
    async (fn: (sessionKey: string) => Promise<Checkout.State>) => {
      const key = sessionKeyRef.current;
      if (!key) {
        throw { code: 'Failed', message: 'Checkout session not initialized.' };
      }

      setState((prev) =>
        prev ? { status: 'loading', session: prev.session } : prev
      );

      try {
        const newState = await fn(key);
        setState(newState);
      } catch (e: any) {
        setState((prev) =>
          prev?.status === 'loading'
            ? { status: 'loaded', session: prev.session }
            : prev
        );
        throw e;
      }
    },
    []
  );

  // Mutation methods — each delegates to withLoading.
  const checkout: Checkout = {
    get sessionKey(): string {
      if (!sessionKeyRef.current) {
        throw new Error('Checkout session not initialized.');
      }
      return sessionKeyRef.current;
    },
    updateShippingAddress: useCallback(
      (address, name, phone) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutUpdateShippingAddress(
            key,
            address,
            name ?? null,
            phone ?? null
          )
        ),
      [withLoading]
    ),
    updateBillingAddress: useCallback(
      (address, name, phone) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutUpdateBillingAddress(
            key,
            address,
            name ?? null,
            phone ?? null
          )
        ),
      [withLoading]
    ),
    applyPromotionCode: useCallback(
      (code) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutApplyPromotionCode(key, code)
        ),
      [withLoading]
    ),
    removePromotionCode: useCallback(
      () =>
        withLoading((key) => NativeStripeSdk.checkoutRemovePromotionCode(key)),
      [withLoading]
    ),
    updateLineItemQuantity: useCallback(
      (lineItemId, quantity) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutUpdateLineItemQuantity(
            key,
            lineItemId,
            quantity
          )
        ),
      [withLoading]
    ),
    selectShippingOption: useCallback(
      (id) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutSelectShippingOption(key, id)
        ),
      [withLoading]
    ),
    updateTaxId: useCallback(
      (type, value) =>
        withLoading((key) =>
          NativeStripeSdk.checkoutUpdateTaxId(key, type, value)
        ),
      [withLoading]
    ),
    refresh: useCallback(
      () => withLoading((key) => NativeStripeSdk.checkoutRefresh(key)),
      [withLoading]
    ),
  };

  return { state, checkout, error };
}
