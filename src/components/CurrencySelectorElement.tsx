import React, { useCallback, useState } from 'react';
import {
  AccessibilityProps,
  LayoutAnimation,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import type { Checkout } from '../types/Checkout';
import type { FontConfig, ThemedColor } from '../types/PaymentSheet';
import NativeCurrencySelectorElement, {
  type HeightChangeEvent,
} from '../specs/NativeCurrencySelectorElement';

/**
 * Controls what content is displayed in each currency option's label.
 */
export enum CurrencySelectorLabelContent {
  /**
   * Automatically determines the best display based on the purchase type.
   * For one-time payments this shows the formatted amount; for recurring
   * payments this shows the currency code.
   */
  Automatic = 'automatic',

  /** Displays only the currency code (e.g. "USD"). */
  CurrencyCode = 'currencyCode',

  /** Displays the formatted amount (e.g. "$12.00"). */
  Amount = 'amount',
}

/**
 * Appearance configuration for CurrencySelectorElement.
 *
 * All properties are optional — when omitted, the element uses
 * platform-appropriate defaults that adapt to light/dark mode.
 */
export interface CurrencySelectorAppearance {
  /** Background color of the selector track. */
  background?: ThemedColor;

  /** Background color of the selected currency pill. */
  selectedBackground?: ThemedColor;

  /** Border color for the track outline. */
  borderColor?: ThemedColor;

  /** Text color for unselected currency options. */
  textColor?: ThemedColor;

  /** Text color for the currently selected currency option. */
  selectedTextColor?: ThemedColor;

  /**
   * Text color for the exchange rate caption and disclosure text.
   *
   * Note: Alpha values below 0.5 are clamped to 0.5 on both platforms
   * to maintain regulatory text legibility.
   */
  textSecondaryColor?: ThemedColor;

  /** Color for error messages shown below the selector. */
  dangerColor?: ThemedColor;

  /**
   * Corner radius applied to the track and selected currency pill, in
   * density-independent pixels.
   *
   * When omitted, the element uses a full capsule shape (50% rounding).
   */
  cornerRadius?: number;

  /** Border width for the track outline, in density-independent pixels. */
  borderWidth?: number;

  /**
   * Vertical padding between the track edges and the currency option
   * content, in density-independent pixels.
   */
  contentVerticalPadding?: number;

  /**
   * Font configuration for the selector labels and captions.
   *
   * Uses the same `FontConfig` shape as PaymentSheet.
   */
  font?: Partial<FontConfig>;

  /**
   * Controls what is displayed in each currency option's label.
   *
   * @default CurrencySelectorLabelContent.Automatic
   */
  labelContent?: CurrencySelectorLabelContent;
}

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

  /**
   * Appearance overrides for the selector.
   *
   * @default platform-appropriate defaults that adapt to light/dark mode
   */
  appearance?: CurrencySelectorAppearance;
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
  appearance,
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
      appearance={appearance}
      style={[styles.container, { height }]}
      onHeightChange={handleHeightChange}
      {...a11yProps}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
