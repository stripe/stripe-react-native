/* eslint-disable react-native/no-inline-styles */
import {
  requireNativeComponent,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  LayoutAnimation,
  Platform,
  findNodeHandle,
  ViewProps,
} from 'react-native';
import type {
  BillingDetails,
  AddressDetails,
  UserInterfaceStyle,
  CardBrand,
} from './Common';
import type { PaymentMethod } from '.';
import * as PaymentSheetTypes from './PaymentSheet';
import NativeStripeSdk from '../NativeStripeSdk';
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import React from 'react';

// Native bridge imports
const { StripeSdk } = NativeModules;
const NativeStripeEmbedded = StripeSdk;
const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * The final result of a confirm call.
 * Typically: payment succeeded (“completed”), canceled, or failed with error.
 */
export type EmbeddedPaymentElementResult =
  | { status: 'completed' }
  | { status: 'canceled' }
  | { status: 'failed'; error: Error };

/**
 * Contains details about a payment method that can be displayed to the customer in the embedded payment element UI.
 */
export interface PaymentOptionDisplayData {
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
  /** The view can display payment methods like “Card” that, when tapped, open a sheet where customers enter their payment method details.
   * The sheet has a button at the bottom. `formSheetAction` controls the action the button performs.
   */
  formSheetAction?: EmbeddedFormSheetAction;
  /**
   * Determines the behavior when a row  is selected. Defaults to `.default`.
   */
  rowSelectionBehavior?: RowSelectionBehavior;
}

// -----------------------------------------------------------------------------
// Embedded API
// -----------------------------------------------------------------------------

class EmbeddedPaymentElement {
  /**
   * Call this when the intent configuration changes (e.g., amount or currency).
   * Cancels any in-progress update. Ensures the correct payment methods are shown and fields are collected.
   * If the selected payment option becomes invalid, it may be cleared.
   * Returns the final result of the update; earlier in-flight updates will return `{ status: 'canceled' }`.
   */
  async update(intentConfig: PaymentSheetTypes.IntentConfiguration) {
    const result =
      await NativeStripeEmbedded.updateEmbeddedPaymentElement(intentConfig);
    return result;
  }

  /**
   * Confirm the payment or setup intent.
   * Waits for any in-progress `update()` call to finish before proceeding.
   * May present authentication flows (e.g., 3DS) if required.
   * Requires the most recent `update()` call to have succeeded.
   * Returns the final result: success, failure, or cancellation.
   */
  async confirm(): Promise<EmbeddedPaymentElementResult> {
    const result = await NativeStripeEmbedded.confirmEmbeddedPaymentElement();
    return result;
  }

  /** Clear the currently selected payment option (reset to null). */
  clearPaymentOption(): void {
    NativeStripeEmbedded.clearEmbeddedPaymentOption();
  }
}

// -----------------------------------------------------------------------------
// JS Factory: createEmbeddedPaymentElement
// -----------------------------------------------------------------------------
let confirmHandlerCallback: EmitterSubscription | null = null;
let formSheetActionConfirmCallback: EmitterSubscription | null = null;
let rowSelectionImmediateActionCallback: EmitterSubscription | null = null;

async function createEmbeddedPaymentElement(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
): Promise<EmbeddedPaymentElement> {
  setupConfirmHandlers(intentConfig, configuration);

  await NativeStripeEmbedded.createEmbeddedPaymentElement(
    intentConfig,
    configuration
  );
  return new EmbeddedPaymentElement();
}

function setupConfirmHandlers(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
) {
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
}

// -----------------------------------------------------------------------------
// React Native View wrappers
// -----------------------------------------------------------------------------
const RNEmbeddedPaymentElementViewIOS = requireNativeComponent<ViewProps>(
  'EmbeddedPaymentElementView'
);

type AndroidProps = ViewProps & {
  configuration: EmbeddedPaymentElementConfiguration;
  intentConfiguration: PaymentSheetTypes.IntentConfiguration;
  onEmbeddedPaymentElementDidUpdateHeight?: (e: {
    nativeEvent: { height: number };
  }) => void;
};
const RNEmbeddedPaymentElementViewAndroid =
  Platform.OS === 'android'
    ? requireNativeComponent<AndroidProps>('StripeEmbeddedPaymentElementView')
    : null;

// -----------------------------------------------------------------------------
// Hook: useEmbeddedPaymentElement
// -----------------------------------------------------------------------------
export interface UseEmbeddedPaymentElementResult {
  // A view that displays payment methods. It can present a sheet to collect more details or display saved payment methods.
  embeddedPaymentElementView: ReactElement | null;
  /**
   * Contains information about the customer's selected payment option.
   * Use this to display the payment option in your own UI
   */
  paymentOption: PaymentOptionDisplayData | null;
  /**
   * Completes the payment or setup.
   * @returns {Promise} The result of the payment after any presented view controllers are dismissed.
   * @note This method requires that the last call to `update` succeeded. If the last `update` call failed, this call will fail. If this method is called while a call to `update` is in progress, it waits until the `update` call completes.
   */
  confirm: () => Promise<EmbeddedPaymentElementResult>;
  /**
   * Call this method when the IntentConfiguration values you used to initialize `EmbeddedPaymentElement` (amount, currency, etc.) change.
   * This ensures the appropriate payment methods are displayed, collect the right fields, etc.
   * @param {Object} intentConfiguration - An updated IntentConfiguration.
   * @throws {Error} Sets loadingError if the update fails.
   * @note Upon completion, `paymentOption` may become null if it's no longer available.
   * @note If you call `update` while a previous call to `update` is still in progress, the previous call is canceled.
   */
  update: (intentConfig: PaymentSheetTypes.IntentConfiguration) => void;
  // Sets the currently selected payment option to null
  clearPaymentOption: () => void;
  // Any error encountered during creation/update, or null
  loadingError: Error | null;
}

/**
 * An asynchronous failable initializer
 * Loads the Customer's payment methods, their default payment method, etc.
 * @param {Object} intentConfiguration - Information about the PaymentIntent or SetupIntent you will create later to complete the confirmation.
 * @param {Object} configuration - Configuration for the PaymentSheet. e.g. your business name, customer details, etc.
 * @returns {EmbeddedPaymentElement|null} A valid EmbeddedPaymentElement instance if successful, null otherwise.
 * @description If loading fails, this function sets the loadingError state variable instead of throwing an error.
 */
export function useEmbeddedPaymentElement(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
): UseEmbeddedPaymentElementResult {
  const isAndroid = Platform.OS === 'android';
  const elementRef = useRef<EmbeddedPaymentElement | null>(null);
  const [element, setElement] = useState<EmbeddedPaymentElement | null>(null);
  const [paymentOption, setPaymentOption] =
    useState<PaymentOptionDisplayData | null>(null);
  const [height, setHeight] = useState<number | undefined>();
  const viewRef = useRef<any>(null);
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  // Create embedded payment element
  useEffect(() => {
    let active = true;
    (async () => {
      const el = await createEmbeddedPaymentElement(
        intentConfig,
        configuration
      );
      if (!active) return;
      elementRef.current = el;
      setElement(el);
    })();
    return () => {
      active = false;
      elementRef.current?.clearPaymentOption();
      elementRef.current = null;
      setElement(null);
    };
  }, [intentConfig, configuration, isAndroid]);

  useEffect(() => {
    const sub = eventEmitter.addListener(
      'embeddedPaymentElementDidUpdatePaymentOption',
      ({ paymentOption: opt }) => setPaymentOption(opt ?? null)
    );
    return () => sub.remove();
  });

  // Listen for height changes
  useEffect(() => {
    const sub = eventEmitter.addListener(
      'embeddedPaymentElementDidUpdateHeight',
      ({ height: h }) => {
        // ignore zero
        if (h > 0) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setHeight(h);
        }
      }
    );
    return () => sub.remove();
  }, []);

  // Listen for loading failures
  useEffect(() => {
    const sub = eventEmitter.addListener(
      'embeddedPaymentElementLoadingFailed',
      (nativeError: { message: string }) => {
        setLoadingError(new Error(nativeError.message));
      }
    );
    return () => sub.remove();
  }, []);

  // Render the embedded view
  const embeddedPaymentElementView = useMemo(() => {
    if (isAndroid && configuration && intentConfig) {
      return (
        RNEmbeddedPaymentElementViewAndroid && (
          <RNEmbeddedPaymentElementViewAndroid
            ref={viewRef}
            style={[{ width: '100%', height: height }]}
            configuration={configuration}
            intentConfiguration={intentConfig}
          />
        )
      );
    }
    if (!element) return null;
    return (
      <RNEmbeddedPaymentElementViewIOS
        ref={viewRef}
        style={{ width: '100%', height }}
      />
    );
  }, [configuration, element, height, intentConfig, isAndroid]);

  // Other APIs
  const confirm = useCallback((): Promise<EmbeddedPaymentElementResult> => {
    if (isAndroid) {
      const tag = findNodeHandle(viewRef.current);
      if (tag == null) {
        return Promise.reject(new Error('Could not find Android view handle'));
      }
      // 1) Call into the native module
      return StripeSdk.confirmEmbeddedPaymentElement(tag).then(() => {
        // 2) Wait for the event
        return new Promise<EmbeddedPaymentElementResult>((resolve) => {
          const sub = eventEmitter.addListener(
            'embeddedPaymentElementFormSheetConfirmComplete',
            (result: EmbeddedPaymentElementResult) => {
              sub.remove();
              resolve(result);
            }
          );
        });
      });
    }

    // iOS: just proxy to the native hook
    return elementRef.current!.confirm();
  }, [isAndroid]);
  const update = useCallback(
    (cfg: PaymentSheetTypes.IntentConfiguration) =>
      elementRef.current!.update(cfg),
    []
  );
  const clearPaymentOption = useCallback((): Promise<void> => {
    if (isAndroid) {
      const tag = findNodeHandle(viewRef.current);
      if (tag == null) {
        return Promise.reject(new Error('Unable to find Android view handle'));
      }
      return StripeSdk.clearEmbeddedPaymentOption(tag);
    }

    // iOS: clear on the element instance
    elementRef.current!.clearPaymentOption();
    return Promise.resolve();
  }, [isAndroid]);

  return {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    update,
    clearPaymentOption,
    loadingError,
  };
}
