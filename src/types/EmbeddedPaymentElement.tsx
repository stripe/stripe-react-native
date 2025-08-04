/* eslint-disable react-native/no-inline-styles */
import {
  LayoutAnimation,
  Platform,
  findNodeHandle,
  EventSubscription,
  HostComponent,
} from 'react-native';
import type {
  BillingDetails,
  AddressDetails,
  UserInterfaceStyle,
  CardBrand,
} from './Common';
import type { PaymentMethod } from '.';
import * as PaymentSheetTypes from './PaymentSheet';
import NativeStripeSdkModule from '../specs/NativeStripeSdkModule';
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import React from 'react';
import { addListener } from '../events';
import NativeEmbeddedPaymentElement, {
  Commands,
  NativeProps,
} from '../specs/NativeEmbeddedPaymentElement';

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
 * Defaults to 'continue'.
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
 * Describes how the EmbeddedPaymentElement handles payment method row selections:
 * - In the `default` case, the payment method option row enters a selected state.
 * - In the `immediateAction` case, `onSelectPaymentOption` is called.
 */
export type EmbeddedRowSelectionBehavior =
  | {
      /**
       * When a payment method option is selected, the customer taps a button to continue or confirm payment.
       * This is the default recommended integration.
       */
      type: 'default';
    }
  | {
      /**
       * When a payment method option is selected, `onSelectPaymentOption` is triggered.
       * You can implement this function to immediately perform an action such as going back to the checkout screen or confirming the payment.
       * Note that certain payment options like Apple Pay and saved payment methods are disabled in this mode if you set
       * `EmbeddedPaymentElementConfiguration.formSheetAction` to `continue`
       */
      type: 'immediateAction';
      onSelectPaymentOption?: () => void;
    };

/**
 * Configuration object (subset of EmbeddedPaymentElement.Configuration).
 */
export interface EmbeddedPaymentElementConfiguration {
  /** Your customer-facing business name. On Android, this is required and cannot be an empty string. */
  merchantDisplayName: string;
  /** The identifier of the Stripe Customer object. See https://stripe.com/docs/api/customers/object#customer_object-id */
  customerId?: string;
  /** A short-lived token that allows the SDK to access a Customer’s payment methods. */
  customerEphemeralKeySecret?: string;
  /** (Experimental) This parameter can be changed or removed at any time (use at your own risk).
   *  The client secret of this Customer Session. Used on the client to set up secure access to the given customer.
   */
  customerSessionClientSecret?: string;
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
  /** PaymentSheet pre-populates the billing fields that are displayed in the Payment Sheet (only country and postal code, as of this version) with these values, if provided. */
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
   * The sheet has a button at the bottom. `formSheetAction` controls the action the button performs. Defaults to 'continue'.
   */
  formSheetAction?: EmbeddedFormSheetAction;
  /** Configuration for custom payment methods in EmbeddedPaymentElement. */
  customPaymentMethodConfiguration?: PaymentSheetTypes.CustomPaymentMethodConfiguration;
  /** Describes how the EmbeddedPaymentElement handles payment method row selections. */
  rowSelectionBehavior?: EmbeddedRowSelectionBehavior;
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
      await NativeStripeSdkModule.updateEmbeddedPaymentElement(intentConfig);
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
    const result =
      await NativeStripeSdkModule.confirmEmbeddedPaymentElement(-1);
    return result;
  }

  /** Clear the currently selected payment option (reset to null). */
  clearPaymentOption(): void {
    NativeStripeSdkModule.clearEmbeddedPaymentOption(-1);
  }
}

// -----------------------------------------------------------------------------
// JS Factory: createEmbeddedPaymentElement
// -----------------------------------------------------------------------------
let confirmHandlerCallback: EventSubscription | null = null;
let formSheetActionConfirmCallback: EventSubscription | null = null;
let customPaymentMethodConfirmCallback: EventSubscription | null = null;
let rowSelectionCallback: EventSubscription | null = null;

async function createEmbeddedPaymentElement(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
): Promise<EmbeddedPaymentElement> {
  setupConfirmAndSelectionHandlers(intentConfig, configuration);

  await NativeStripeSdkModule.createEmbeddedPaymentElement(
    intentConfig,
    configuration
  );
  return new EmbeddedPaymentElement();
}

function setupConfirmAndSelectionHandlers(
  intentConfig: PaymentSheetTypes.IntentConfiguration,
  configuration: EmbeddedPaymentElementConfiguration
) {
  const confirmHandler = intentConfig.confirmHandler;
  if (confirmHandler) {
    confirmHandlerCallback?.remove();
    confirmHandlerCallback = addListener(
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
          NativeStripeSdkModule.intentCreationCallback
        );
      }
    );
  }

  if (configuration.formSheetAction?.type === 'confirm') {
    const confirmFormSheetHandler =
      configuration.formSheetAction.onFormSheetConfirmComplete;
    if (confirmFormSheetHandler) {
      formSheetActionConfirmCallback?.remove();
      formSheetActionConfirmCallback = addListener(
        'embeddedPaymentElementFormSheetConfirmComplete',
        (result: EmbeddedPaymentElementResult) => {
          // Pass the result back to the formSheetAction handler
          confirmFormSheetHandler(result);
        }
      );
    }
  }

  // Setup custom payment method confirmation handler
  if (configuration.customPaymentMethodConfiguration) {
    const customPaymentMethodHandler =
      configuration.customPaymentMethodConfiguration
        .confirmCustomPaymentMethodCallback;
    if (customPaymentMethodHandler) {
      customPaymentMethodConfirmCallback?.remove();
      customPaymentMethodConfirmCallback = addListener(
        'onCustomPaymentMethodConfirmHandlerCallback',
        ({
          customPaymentMethod,
          billingDetails,
        }: {
          customPaymentMethod: PaymentSheetTypes.CustomPaymentMethod;
          billingDetails: BillingDetails | null;
        }) => {
          // Call the user's handler with a result handler callback
          customPaymentMethodHandler(
            customPaymentMethod,
            billingDetails,
            (result: PaymentSheetTypes.CustomPaymentMethodResult) => {
              // Send the result back to the native side
              NativeStripeSdkModule.customPaymentMethodResultCallback(result);
            }
          );
        }
      );
    }
  }

  if (configuration.rowSelectionBehavior?.type === 'immediateAction') {
    const rowSelectionHandler =
      configuration.rowSelectionBehavior.onSelectPaymentOption;
    if (rowSelectionHandler) {
      rowSelectionCallback?.remove();
      rowSelectionCallback = addListener(
        'embeddedPaymentElementRowSelectionImmediateAction',
        () => {
          rowSelectionHandler();
        }
      );
    }
  }
}

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
  const viewRef = useRef<React.ComponentRef<HostComponent<NativeProps>>>(null);
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  function getElementOrThrow(ref: {
    current: EmbeddedPaymentElement | null;
  }): EmbeddedPaymentElement {
    if (!ref.current) {
      throw new Error(
        'EmbeddedPaymentElement is not ready yet – wait until it finishes loading before calling this API.'
      );
    }
    return ref.current;
  }

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
      elementRef.current = null;
      setElement(null);
    };
  }, [intentConfig, configuration, viewRef, isAndroid]);

  useEffect(() => {
    const sub = addListener(
      'embeddedPaymentElementDidUpdatePaymentOption',
      ({ paymentOption: opt }) => setPaymentOption(opt ?? null)
    );
    return () => sub.remove();
  });

  // Listen for height changes
  useEffect(() => {
    const sub = addListener(
      'embeddedPaymentElementDidUpdateHeight',
      ({ height: h }) => {
        // ignore zero
        if (h > 0 || (isAndroid && h === 0)) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setHeight(h);
        }
      }
    );
    return () => sub.remove();
  }, [isAndroid]);

  // Listen for loading failures
  useEffect(() => {
    const sub = addListener(
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
        <NativeEmbeddedPaymentElement
          ref={viewRef}
          style={[{ width: '100%', height: height }]}
          configuration={configuration}
          intentConfiguration={intentConfig}
        />
      );
    }
    if (!element) return null;
    return (
      <NativeEmbeddedPaymentElement
        ref={viewRef}
        style={{ width: '100%', height }}
        configuration={configuration}
        intentConfiguration={intentConfig}
      />
    );
  }, [configuration, element, height, intentConfig, isAndroid]);

  // Other APIs
  const confirm = useCallback((): Promise<EmbeddedPaymentElementResult> => {
    const currentRef = viewRef.current;

    if (isAndroid) {
      if (currentRef) {
        const promise = new Promise<EmbeddedPaymentElementResult>((resolve) => {
          const sub = addListener(
            'embeddedPaymentElementFormSheetConfirmComplete',
            (result: EmbeddedPaymentElementResult) => {
              sub.remove();
              resolve(result);
            }
          );
        });

        Commands.confirm(currentRef);

        return promise;
      } else {
        return Promise.reject(
          new Error('Unable to find Android embedded payment element view!')
        );
      }
    }

    // iOS: just proxy to the native hook
    return getElementOrThrow(elementRef).confirm();
  }, [isAndroid]);
  const update = useCallback(
    (cfg: PaymentSheetTypes.IntentConfiguration) =>
      getElementOrThrow(elementRef).update(cfg),
    []
  );
  const clearPaymentOption = useCallback((): Promise<void> => {
    if (isAndroid) {
      const tag = findNodeHandle(viewRef.current);
      if (tag == null) {
        return Promise.reject(new Error('Unable to find Android view handle'));
      }
      return NativeStripeSdkModule.clearEmbeddedPaymentOption(tag);
    }

    // iOS: clear on the element instance
    getElementOrThrow(elementRef).clearPaymentOption();
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
