// EmbeddedPaymentElement.ts

import {
  requireNativeComponent,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  LayoutAnimation,
} from 'react-native';
import type {
  BillingDetails,
  AddressDetails,
  UserInterfaceStyle,
  CardBrand,
} from './Common';
import type { PaymentMethod } from '.';
import * as PaymentSheetTypes from './PaymentSheet';
import type {
  ImageSourcePropType,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';
import NativeStripeSdk from '../NativeStripeSdk';
import { forwardRef, useEffect, useState } from 'react';
import React from 'react';

const { StripeSdk } = NativeModules;
const NativeStripeEmbedded: StripeEmbeddedNativeModule = StripeSdk;

/**
 * The final result of a confirm call.
 * Typically: payment succeeded (“completed”), canceled, or failed with error.
 */
export type EmbeddedPaymentElementResult =
  | { status: 'completed' }
  | { status: 'canceled' }
  | { status: 'failed'; error: Error };

/**
 * The result of an update call.
 */
export type EmbeddedPaymentElementUpdateResult =
  | { status: 'succeeded' }
  | { status: 'canceled' }
  | { status: 'failed'; error: Error };

/**
 * Information about the currently selected payment option.
 * You might store an image, label, billingDetails, etc.
 */
export interface PaymentOptionDisplayData {
  image: ImageSourcePropType;
  label: string;
  billingDetails?: BillingDetails;
  paymentMethodType: string;
  mandateText?: string;
}

/**
 * If the embedded element wants to open a form sheet, it can either confirm inside it
 * or return to you to .confirm() yourself.
 */
export type EmbeddedFormSheetAction =
  | {
      type: 'confirm';
      onFormSheetConfirmComplete?: (
        result: EmbeddedPaymentElementResult
      ) => void;
    }
  | {
      type: 'continue';
    };

export type RowSelectionBehavior =
  | { type: 'default' }
  | { type: 'immediateAction'; didSelectPaymentOption: () => void };

/**
 * Configuration object (subset of EmbeddedPaymentElementConfiguration.Configuration).
 */
export interface EmbeddedPaymentElementConfiguration {
  /** Your customer-facing business name. On Android, this is required and cannot be an empty string. */
  merchantDisplayName: string;
  /** The identifier of the Stripe Customer object. See https://stripe.com/docs/api/customers/object#customer_object-id */
  customerId?: string;
  /** iOS only. Enable Apple Pay in the Payment Sheet by passing an ApplePayParams object.  */
  applePay?: PaymentSheetTypes.ApplePayParams;
  /** Android only. Enable Google Pay in the Payment Sheet by passing a GooglePayParams object.  */
  googlePay?: PaymentSheetTypes.GooglePayParams;
  /** Configuration for Link */
  link?: PaymentSheetTypes.LinkParams;
  /** The color styling to use for PaymentSheet UI. Defaults to 'automatic'. */
  style?: UserInterfaceStyle;
  /** A URL that redirects back to your app that PaymentSheet can use to auto-dismiss web views used for additional authentication, e.g. 3DS2 */
  returnURL?: string;
  /** Configuration for how billing details are collected during checkout. */
  billingDetailsCollectionConfiguration?: PaymentSheetTypes.BillingDetailsCollectionConfiguration;
  /** PaymentSheet pre-populates the billing fields that are displayed in the Payment Sheet (only country and postal code, as of this version) with the values provided. */
  defaultBillingDetails?: BillingDetails;
  /**
   * The shipping information for the customer. If set, PaymentSheet will pre-populate the form fields with the values provided.
   * This is used to display a "Billing address is same as shipping" checkbox if `defaultBillingDetails` is not provided.
   * If `name` and `line1` are populated, it's also [attached to the PaymentIntent](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-shipping) during payment.
   */
  defaultShippingDetails?: AddressDetails;
  /** If true, allows payment methods that do not move money at the end of the checkout. Defaults to false.
   *
   * Some payment methods can’t guarantee you will receive funds from your customer at the end of the checkout
   * because they take time to settle (eg. most bank debits, like SEPA or ACH) or require customer action to
   * complete (e.g. OXXO, Konbini, Boleto). If this is set to true, make sure your integration listens to webhooks
   * for notifications on whether a payment has succeeded or not.
   */
  allowsDelayedPaymentMethods?: boolean;
  /** Customizes the appearance of PaymentSheet */
  appearance?: PaymentSheetTypes.AppearanceParams;
  /** The label to use for the primary button. If not set, Payment Sheet will display suitable default labels for payment and setup intents. */
  primaryButtonLabel?: string;
  /** Optional configuration to display a custom message when a saved payment method is removed. iOS only. */
  removeSavedPaymentMethodMessage?: string;
  /** The list of preferred networks that should be used to process payments made with a co-branded card.
   * This value will only be used if your user hasn't selected a network themselves. */
  preferredNetworks?: Array<CardBrand>;
  /** By default, PaymentSheet will use a dynamic ordering that optimizes payment method display for the customer.
   *  You can override the default order in which payment methods are displayed in PaymentSheet with a list of payment method types.
   *  See https://stripe.com/docs/api/payment_methods/object#payment_method_object-type for the list of valid types.  You may also pass external payment methods.
   *  - Example: ["card", "external_paypal", "klarna"]
   *  - Note: If you omit payment methods from this list, they’ll be automatically ordered by Stripe after the ones you provide. Invalid payment methods are ignored.
   */
  paymentMethodOrder?: Array<String>;
  /** This is an experimental feature that may be removed at any time.
   *  Defaults to true. If true, the customer can delete all saved payment methods.
   *  If false, the customer can't delete if they only have one saved payment method remaining.
   */
  allowsRemovalOfLastSavedPaymentMethod?: boolean;
  /**
   * By default, PaymentSheet will accept all supported cards by Stripe.
   * You can specify card brands PaymentSheet should block or allow payment for by providing an array of those card brands.
   * Note: This is only a client-side solution.
   * Note: Card brand filtering is not currently supported in Link.
   */
  cardBrandAcceptance?: PaymentSheetTypes.CardBrandAcceptance;
  /** (Private Preview) This parameter is expected to be removed once we GA this feature
   * When using customerSessions, allow users to update their saved cards
   */
  updatePaymentMethodEnabled?: boolean;

  // Embedded APIs
  formSheetAction?: EmbeddedFormSheetAction;
  embeddedViewDisplaysMandateText?: boolean;
  rowSelectionBehavior?: RowSelectionBehavior;
}

/* -----------------------------------------------------------------------
 * (2) The JS object that user code calls to do .update(), .confirm(), etc.
 * ----------------------------------------------------------------------*/

export interface EmbeddedPaymentElement {
  /**
   * Update the payment element when your price or currency changes.
   * Cancels any previous in-flight update. Returns final result.
   */
  update(
    intentConfiguration: PaymentSheetTypes.IntentConfiguration
  ): Promise<EmbeddedPaymentElementUpdateResult>;

  /**
   * Confirm the payment or setup.
   * Wait for any in-flight update to finish, do 3DS, etc.
   * Returns final success/fail/canceled.
   */
  confirm(): Promise<EmbeddedPaymentElementResult>;

  /** Clear the currently selected payment option (reset to null). */
  clearPaymentOption(): void;
}

interface StripeEmbeddedNativeModule {
  createEmbeddedPaymentElement: (
    intentConfig: PaymentSheetTypes.IntentConfiguration,
    configuration: EmbeddedPaymentElementConfiguration
  ) => Promise<{
    paymentOption: PaymentOptionDisplayData | null;
  }>;

  updateEmbeddedPaymentElement: (
    intentConfig: PaymentSheetTypes.IntentConfiguration
  ) => Promise<EmbeddedPaymentElementUpdateResult>;

  confirmEmbeddedPaymentElement: () => Promise<EmbeddedPaymentElementResult>;

  clearEmbeddedPaymentOption: () => void;
}

class EmbeddedPaymentElementImpl implements EmbeddedPaymentElement {
  async update(
    intentConfig: PaymentSheetTypes.IntentConfiguration
  ): Promise<EmbeddedPaymentElementUpdateResult> {
    const result =
      await NativeStripeEmbedded.updateEmbeddedPaymentElement(intentConfig);
    return result;
  }

  async confirm(): Promise<EmbeddedPaymentElementResult> {
    const result = await NativeStripeEmbedded.confirmEmbeddedPaymentElement();
    return result;
  }

  clearPaymentOption(): void {
    NativeStripeEmbedded.clearEmbeddedPaymentOption();
  }
}

const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);
let confirmHandlerCallback: EmitterSubscription | null = null;
let formSheetActionConfirmCallback: EmitterSubscription | null = null;
let rowSelectionImmediateActionCallback: EmitterSubscription | null = null;

/**
 * Creates a new EmbeddedPaymentElement instance, returning a JS object.
 */
export async function createEmbeddedPaymentElement(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
): Promise<EmbeddedPaymentElement> {
  const confirmHandler = intentConfig.confirmHandler;
  if (confirmHandler) {
    confirmHandlerCallback?.remove();
    confirmHandlerCallback = eventEmitter.addListener(
      'onConfirmHandlerCallback',
      ({
        paymentMethod,
        shouldSavePaymentMethod,
      }: {
        paymentMethod: PaymentMethod.Result;
        shouldSavePaymentMethod: boolean;
      }) => {
        confirmHandler(
          paymentMethod,
          shouldSavePaymentMethod,
          NativeStripeSdk.intentCreationCallback
        );
      }
    );
  }

  if (configuration.formSheetAction?.type === 'confirm') {
    const confirmFormSheetHandler =
      configuration.formSheetAction.onFormSheetConfirmComplete;
    if (confirmFormSheetHandler) {
      formSheetActionConfirmCallback?.remove();
      formSheetActionConfirmCallback = eventEmitter.addListener(
        'embeddedPaymentElementFormSheetConfirmComplete',
        (result: EmbeddedPaymentElementResult) => {
          // Pass the result back to the formSheetAction handler
          confirmFormSheetHandler(result);
        }
      );
    }
  }

  if (configuration.rowSelectionBehavior?.type === 'immediateAction') {
    const rowSelectionImmediateActionHandler =
      configuration.rowSelectionBehavior.didSelectPaymentOption;
    if (rowSelectionImmediateActionHandler) {
      rowSelectionImmediateActionCallback?.remove();
      rowSelectionImmediateActionCallback = eventEmitter.addListener(
        'embeddedPaymentElementRowSelectionImmediateAction',
        () => {
          // Call the immediate action handler provided in configuration.
          rowSelectionImmediateActionHandler();
        }
      );
    }
  }

  await NativeStripeEmbedded.createEmbeddedPaymentElement(
    intentConfig,
    configuration
  );
  return new EmbeddedPaymentElementImpl();
}

export const NativeEmbeddedPaymentElementView =
  requireNativeComponent<NativeProps>('EmbeddedPaymentElementView');

const embeddedEventEmitter = new NativeEventEmitter(StripeSdk);

export interface EmbeddedPaymentElementDidUpdateHeightEvent {
  height: number;
}

export interface EmbeddedPaymentElementWillPresentEvent {}

export interface EmbeddedPaymentElementDidUpdatePaymentOptionEvent {
  paymentOption?: PaymentOptionDisplayData | null;
}

/**
 * Called when the embedded Payment Element changes its height.
 */
export function onEmbeddedPaymentElementDidUpdateHeight(
  listener: (event: EmbeddedPaymentElementDidUpdateHeightEvent) => void
): EmitterSubscription {
  return embeddedEventEmitter.addListener(
    'embeddedPaymentElementDidUpdateHeight',
    listener
  );
}

/**
 * Called just before the Payment Element presents a form sheet.
 */
export function onEmbeddedPaymentElementWillPresent(
  listener: (event: EmbeddedPaymentElementWillPresentEvent) => void
): EmitterSubscription {
  return embeddedEventEmitter.addListener(
    'embeddedPaymentElementWillPresent',
    listener
  );
}

/**
 * Called whenever the Payment Element’s selected payment method changes.
 */
export function onEmbeddedPaymentElementDidUpdatePaymentOption(
  listener: (event: EmbeddedPaymentElementDidUpdatePaymentOptionEvent) => void
): EmitterSubscription {
  return embeddedEventEmitter.addListener(
    'embeddedPaymentElementDidUpdatePaymentOption',
    listener
  );
}

interface Props {
  /** Any styles the merchant wants; width, margin, etc. */
  style?: StyleProp<ViewStyle>;
  /**
   * If false we will *not* manage the height and will emit the
   * `embeddedPaymentElementDidUpdateHeight` event exactly as today.
   * Defaults to true.
   */
  manageHeight?: boolean;
  /**
   * Animate height changes with LayoutAnimation.  Defaults to true.
   * Merchants can disable or supply their own animations.
   */
  animate?: boolean;
}

export const EmbeddedPaymentElementView = forwardRef<
  React.ElementRef<typeof NativeEmbeddedPaymentElementView>,
  Props
>(({ manageHeight = true, animate = true, style }, ref) => {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (!manageHeight) return;
    const sub = onEmbeddedPaymentElementDidUpdateHeight(
      ({ height: newHeight }) => {
        if (animate) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setHeight(newHeight);
      }
    );
    return () => sub.remove();
  }, [manageHeight, animate]);

  const mergedStyle: StyleProp<ViewStyle> = manageHeight
    ? [{ width: '100%', height }, style]
    : style;

  return <NativeEmbeddedPaymentElementView ref={ref} style={mergedStyle} />;
});

type NativeProps = ViewProps & {
  /* any extra native‑only props / events */
};
