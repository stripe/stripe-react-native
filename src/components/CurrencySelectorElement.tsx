import React, { useCallback, useState } from 'react';
import {
  AccessibilityProps,
  LayoutAnimation,
  NativeSyntheticEvent,
} from 'react-native';
import type { Checkout } from '../types/Checkout';
import NativeCurrencySelectorElement, {
  type HeightChangeEvent,
} from '../specs/NativeCurrencySelectorElement';

/**
 * Props for {@link CurrencySelectorElement}.
 * @internal
 */
export interface CurrencySelectorElementProps extends AccessibilityProps {
  /**
   * The `Checkout` handle returned by `useCheckout`.
   *
   * The element reads currency options from this session and calls
   * `selectCurrency` internally — you never call it yourself.
   */
  checkout: Checkout;

  /**
   * When `true`, the toggle is visible but does not respond to taps.
   *
   * Tip: pass `disabled={state?.status === 'loading'}` to freeze the
   * selector while an unrelated mutation (e.g. applying a promo code)
   * is in flight. The element also disables itself automatically
   * during its own currency-selection network call.
   *
   * @default false
   */
  disabled?: boolean;
}

/**
 * A self-contained currency selector for Adaptive Pricing.
 *
 * Place this element on your cart or checkout page **near the total price**,
 * above the Payment Element. It automatically:
 *
 * - Reads currency options from the `Checkout` session
 * - Renders a two-option toggle with exchange rate disclosure
 * - Calls `selectCurrency` when the customer taps an option
 * - Collapses to zero height when Adaptive Pricing is unavailable
 * - Displays inline errors on failed selections
 *
 * Session state updates automatically through `useCheckout` — no extra
 * wiring needed to keep your cart totals in sync.
 *
 * @example
 * ```tsx
 * const { state, checkout } = useCheckout(clientSecret, {
 *   adaptivePricing: { allowed: true },
 * });
 *
 * return (
 *   <ScrollView>
 *     <CurrencySelectorElement checkout={checkout} />
 *     <Text>{formatTotal(state?.session.totals?.total, state?.session.currency)}</Text>
 *   </ScrollView>
 * );
 * ```
 *
 * @param props {@link CurrencySelectorElementProps}
 * @category ReactComponents
 * @internal
 */
export function CurrencySelectorElement({
  checkout,
  disabled = false,
  ...a11yProps
}: CurrencySelectorElementProps) {
  const [height, setHeight] = useState<number>(0);

  const handleHeightChange = useCallback(
    (e: NativeSyntheticEvent<HeightChangeEvent>) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHeight(e.nativeEvent.height);
    },
    []
  );

  return (
    <NativeCurrencySelectorElement
      sessionKey={checkout.sessionKey}
      disabled={disabled}
      style={{ width: '100%', height }}
      onHeightChange={handleHeightChange}
      {...a11yProps}
    />
  );
}
