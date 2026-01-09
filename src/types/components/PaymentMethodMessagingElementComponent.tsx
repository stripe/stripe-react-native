/* eslint-disable react-native/no-inline-styles */
import {
  //requireNativeComponent,
  // NativeModules,
  // NativeEventEmitter,
  // EmitterSubscription,
  // LayoutAnimation,
  // Platform,
  // findNodeHandle,
  // ViewProps,
  NativeSyntheticEvent,
} from 'react-native';
// import NativeStripeSdk from '../NativeStripeSdk';
// import {
//   ReactElement,
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from 'react';

import * as PaymentSheetTypes from '../PaymentSheet';
// import React from 'react';

// Native bridge imports
// const { StripeSdk } = NativeModules;
// const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * The final result of a configure call.
 * Typically: succeeded, no_content, or failed with error.
 */
export type PaymentMethodMessagingElementResult =
  | { status: 'succeeded' }
  | { status: 'no_content' }
  | { status: 'failed'; error: Error };

/** Style for the images displayed by the element. */
export enum Style {
  /** A flat style */
  Flat = 'flat',
  /** A dark style */
  Dark = 'dark',
  /** A light style */
  Light = 'light',
}

export interface PaymentMethodMessagingElementAppearance {
  /** Font settings for the element. */
  font?: PaymentSheetTypes.FontConfig;
  /** The color used for the element text. */
  textColor?: string;
  /** The color used for the info icon. */
  infoIconColor?: string;
  /** The theme of the images displayed by the element. */
  style?: Style;
}

/**
 * Configuration object.
 */
export interface PaymentMethodMessagingElementConfiguration {
  /** Amount intended to be collected in the smallest currency unit (e.g. 100 cents to charge $1.00). */
  amount: number;
  /** Three-letter ISO currency code, in lowercase. Must be a supported currency. */
  currency: string;
  /**
   * Language code used to localize message displayed in the element.
   * See [the Stripe documentation](https://docs.stripe.com/js/appendix/supported_locales) for a list of
   * supported values. Defaults to the current device locale language.
   * **Note**: Not all device locales are supported by Stripe, and English will be used in the case of
   * an unsupported locale. If you want to ensure a specific locale is used, pass it explicitly.
   */
  locale?: string;
  /** Two letter country code of the customer's location. If not provided, country will be determined based on IP Address. */
  country?: string;
  /**
   * The payment methods to request messaging for. Supported values are "affirm", "afterpay_clearpay", and "klarna".
   * If null, uses your preferences from the [Stripe dashboard](https://dashboard.stripe.com/settings/payment_methods) to show the relevant payment methods.
   * See [Dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods) for more details.
   */
  paymentMethodTypes?: Array<string>;
}

export type OnLoadCompleteEvent = NativeSyntheticEvent<{
  result: PaymentMethodMessagingElementResult;
}>;

export interface NativeProps {
  appearance?: PaymentMethodMessagingElementAppearance;
  configuration: PaymentMethodMessagingElementConfiguration;
  onLoadComplete(event: OnLoadCompleteEvent): void;
}
