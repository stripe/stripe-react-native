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
 * Contains details about a payment method that can be displayed to the customer in the embedded payment element UI.
 */
export interface PaymentOptionDisplayData {
  /**
   * An image representing the payment method, such as a VISA logo or Apple Pay icon.
   */
  image: ImageSourcePropType;
  /**
   * A user-facing label for the payment method, like "Apple Pay" or "•••• 4242" for a card.
   */
  label: string;
  /**
   * Optional billing details associated with the payment method, such as name, email, or address.
   */
  billingDetails?: BillingDetails;
  /**
   * A string identifier for the type of payment method.
   * Stripe values: https://stripe.com/docs/api/payment_methods/object#payment_method_object-type
   * External methods: https://stripe.com/docs/payments/external-payment-methods?platform=ios#available-external-payment-methods
   * Apple Pay: "apple_pay"
   */
  paymentMethodType: string;
  /**
   * Optional base64-encoded regulatory mandate text.
   * If `embeddedViewDisplaysMandateText = false`, this must be shown near the buy button in a tappable view that supports links.
   */
  mandateText?: string;
}

/**
 * Describes the action performed when the bottom button in the embedded payment form sheet is tapped.
 * The embedded view may show payment method options such as "Card". When selected, a form sheet appears
 * for customers to input their payment details. At the bottom of that form sheet is a button.
 * This type determines what tapping that button does:
 * - In the `confirm` case, the button says “Pay” or “Set up” and triggers confirmation of the payment or setup intent inside the sheet.
 * - In the `continue` case, the button says “Continue” and simply dismisses the sheet. The payment or setup is then confirmed outside the sheet, typically in your app.
 */
export type EmbeddedFormSheetAction =
  | {
      /**
       * The button says “Pay” or “Set up”. When tapped, it confirms the payment or setup directly within the form sheet.
       * @param result - Callback invoked with the result of the confirmation. You can use this to show a success message or handle errors.
       */
      type: 'confirm';
      onFormSheetConfirmComplete?: (
        result: EmbeddedPaymentElementResult
      ) => void;
    }
  | {
      /**
       * The button says “Continue”. When tapped, the form sheet closes without confirming anything.
       * Use this when you want to handle confirmation elsewhere in your app after the customer has filled in their details.
       */
      type: 'continue';
    };

/**
 * Describes how row selections are handled in the `EmbeddedPaymentElement` view.
 *
 * When customers select a payment option (like a card), your app can either:
 * - Wait for the customer to manually confirm by tapping a button (`default` behavior), or
 * - Immediately perform an action as soon as the option is selected (`immediateAction` behavior).
 */
export type RowSelectionBehavior =
  | {
      /**
       * Default behavior.
       * When a customer selects a payment option, they must tap a separate button to continue or confirm the payment.
       * This is the recommended and most flexible integration pattern.
       */
      type: 'default';
    }
  | {
      /**
       * Immediate action behavior.
       * When a customer selects a payment option, `didSelectPaymentOption` is triggered right away.
       * This allows you to immediately perform an action—such as navigating back to the checkout screen or confirming payment—without waiting for a separate button tap.
       * ⚠️ Note: Some payment options (e.g., Apple Pay, saved payment methods) are not available in this mode if `formSheetAction` is set to `'confirm'`.
       */
      type: 'immediateAction';

      /**
       * Callback triggered immediately when a payment option is selected.
       * Implement this to handle immediate flow transitions (e.g., confirmation or navigation).
       */
      didSelectPaymentOption: () => void;
    };

/**
 * Configuration object (subset of EmbeddedPaymentElement.Configuration).
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
  /** A URL that redirects back to your app that EmbeddedPaymentElement can use to auto-dismiss web views used for additional authentication, e.g. 3DS2 */
  returnURL?: string;
  /** Configuration for how billing details are collected during checkout. */
  billingDetailsCollectionConfiguration?: PaymentSheetTypes.BillingDetailsCollectionConfiguration;
  /** PaymentSheet pre-populates the billing fields that are displayed in the Payment Sheet (only country and postal code, as of this version) with the values provided. */
  defaultBillingDetails?: BillingDetails;
  /**
   * The shipping information for the customer. If set, EmbeddedPaymentElement will pre-populate the form fields with the values provided.
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
  /** Customizes the appearance of EmbeddedPaymentElement */
  appearance?: PaymentSheetTypes.AppearanceParams;
  /** The label to use for the primary button. If not set, Payment Sheet will display suitable default labels for payment and setup intents. */
  primaryButtonLabel?: string;
  /** Optional configuration to display a custom message when a saved payment method is removed. iOS only. */
  removeSavedPaymentMethodMessage?: string;
  /** The list of preferred networks that should be used to process payments made with a co-branded card.
   * This value will only be used if your user hasn't selected a network themselves. */
  preferredNetworks?: Array<CardBrand>;
  /** By default, EmbeddedPaymentElement will use a dynamic ordering that optimizes payment method display for the customer.
   *  You can override the default order in which payment methods are displayed in EmbeddedPaymentElement with a list of payment method types.
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
   * By default, EmbeddedPaymentElement will accept all supported cards by Stripe.
   * You can specify card brands EmbeddedPaymentElement should block or allow payment for by providing an array of those card brands.
   * Note: This is only a client-side solution.
   * Note: Card brand filtering is not currently supported in Link.
   */
  cardBrandAcceptance?: PaymentSheetTypes.CardBrandAcceptance;
  /** (Private Preview) This parameter is expected to be removed once we GA this feature
   * When using customerSessions, allow users to update their saved cards
   */
  updatePaymentMethodEnabled?: boolean;
  /** The view can display payment methods like “Card” that, when tapped, open a sheet where customers enter their payment method details.
   * The sheet has a button at the bottom. `formSheetAction` controls the action the button performs.
   */
  formSheetAction?: EmbeddedFormSheetAction;
  /** Controls whether the view displays mandate text at the bottom for payment methods that require it. If set to `false`, your integration must display `PaymentOptionDisplayData.mandateText` to the customer near your “Buy” button to comply with regulations.
   * Note: This doesn't affect mandates displayed in the form sheet.
   */
  embeddedViewDisplaysMandateText?: boolean;
  /**
   * Determines the behavior when a row  is selected. Defaults to `.default`.
   */
  rowSelectionBehavior?: RowSelectionBehavior;
}

export interface EmbeddedPaymentElement {
  /**
   * Call this when the intent configuration changes (e.g., amount or currency).
   * Cancels any in-progress update. Ensures the correct payment methods are shown and fields are collected.
   * If the selected payment option becomes invalid, it may be cleared.
   * Returns the final result of the update; earlier in-flight updates will return `{ status: 'canceled' }`.
   */
  update(
    intentConfiguration: PaymentSheetTypes.IntentConfiguration
  ): Promise<EmbeddedPaymentElementUpdateResult>;

  /**
   * Confirm the payment or setup intent.
   * Waits for any in-progress `update()` call to finish before proceeding.
   * May present authentication flows (e.g., 3DS) if required.
   * Requires the most recent `update()` call to have succeeded.
   * Returns the final result: success, failure, or cancellation.
   */
  confirm(): Promise<EmbeddedPaymentElementResult>;

  /** Clear the currently selected payment option (reset to null). */
  clearPaymentOption(): void;
}

interface StripeEmbeddedNativeModule {
  /**
   * Asynchronously creates and initializes an EmbeddedPaymentElement.
   * Loads the customer’s payment methods, default selection, and prepares the UI.
   * @param intentConfig Configuration describing the future PaymentIntent or SetupIntent to be confirmed.
   * @param configuration UI and customer config for the embedded payment sheet (e.g., business name, customer ID).
   * @returns An object containing the currently selected payment option, or `null` if none is selected.
   * @throws An error if the element failed to load.
   */
  createEmbeddedPaymentElement: (
    intentConfig: PaymentSheetTypes.IntentConfiguration,
    configuration: EmbeddedPaymentElementConfiguration
  ) => Promise<{
    paymentOption: PaymentOptionDisplayData | null;
  }>;

  /**
   * Confirm the payment or setup intent.
   * Waits for any in-progress `update()` call to finish before proceeding.
   * May present authentication flows (e.g., 3DS) if required.
   * Requires the most recent `update()` call to have succeeded.
   * Returns the final result: success, failure, or cancellation.
   */
  updateEmbeddedPaymentElement: (
    intentConfig: PaymentSheetTypes.IntentConfiguration
  ) => Promise<EmbeddedPaymentElementUpdateResult>;

  confirmEmbeddedPaymentElement: () => Promise<EmbeddedPaymentElementResult>;

  /** Clear the currently selected payment option (reset to null). */
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

interface EmbeddedPaymentElementDidUpdateHeightEvent {
  height: number;
}

export interface EmbeddedPaymentElementWillPresentEvent {}

export interface EmbeddedPaymentElementDidUpdatePaymentOptionEvent {
  paymentOption?: PaymentOptionDisplayData | null;
}

/**
 * Called when the embedded Payment Element changes its height.
 */
function onEmbeddedPaymentElementDidUpdateHeight(
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
