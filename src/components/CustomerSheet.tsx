import React from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  EmitterSubscription,
} from 'react-native';
import NativeStripeSdk from '../NativeStripeSdk';
import type {
  CustomerSheetInitParams,
  CustomerSheetPresentParams,
  CustomerSheetResult,
  CustomerSheetError,
  StripeError,
  CustomerAdapter,
} from '../types';

const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);
let fetchPaymentMethodsCallback: EmitterSubscription | null = null;
let attachPaymentMethodCallback: EmitterSubscription | null = null;
let detachPaymentMethodCallback: EmitterSubscription | null = null;
let setSelectedPaymentOptionCallback: EmitterSubscription | null = null;
let fetchSelectedPaymentOptionCallback: EmitterSubscription | null = null;
let setupIntentClientSecretForCustomerAttachCallback: EmitterSubscription | null =
  null;

/** Initialize an instance of Customer Sheet with your desired configuration. */
const initialize = async (
  params: CustomerSheetInitParams
): Promise<{ error?: StripeError<CustomerSheetError> }> => {
  if (params.customerAdapter) {
    configureCustomerAdapterEventListeners(params.customerAdapter);
  }

  try {
    const { error } = await NativeStripeSdk.initCustomerSheet(params);
    if (error) {
      return { error };
    }
    return {};
  } catch (error: any) {
    return {
      error,
    };
  }
};

const configureCustomerAdapterEventListeners = (
  customerAdapter: CustomerAdapter
) => {
  const fetchPaymentMethods = customerAdapter.fetchPaymentMethods;

  if (fetchPaymentMethods) {
    fetchPaymentMethodsCallback?.remove();
    fetchPaymentMethodsCallback = eventEmitter.addListener(
      'onCustomerAdapterFetchPaymentMethodsCallback',
      async () => {
        const paymentMethods = await fetchPaymentMethods();
        await NativeStripeSdk.customerAdapterFetchPaymentMethodsCallback(
          paymentMethods
        );
      }
    );
  }

  const attachPaymentMethod = customerAdapter.attachPaymentMethod;
  if (attachPaymentMethod) {
    attachPaymentMethodCallback?.remove();
    attachPaymentMethodCallback = eventEmitter.addListener(
      'onCustomerAdapterAttachPaymentMethodCallback',
      async ({ paymentMethodId }: { paymentMethodId: string }) => {
        await attachPaymentMethod(paymentMethodId);
        await NativeStripeSdk.customerAdapterAttachPaymentMethodCallback();
      }
    );
  }

  const detachPaymentMethod = customerAdapter.detachPaymentMethod;
  if (detachPaymentMethod) {
    detachPaymentMethodCallback?.remove();
    detachPaymentMethodCallback = eventEmitter.addListener(
      'onCustomerAdapterDetachPaymentMethodCallback',
      async ({ paymentMethodId }: { paymentMethodId: string }) => {
        await detachPaymentMethod(paymentMethodId);
        await NativeStripeSdk.customerAdapterDetachPaymentMethodCallback();
      }
    );
  }

  const setSelectedPaymentOption = customerAdapter.setSelectedPaymentOption;
  if (setSelectedPaymentOption) {
    setSelectedPaymentOptionCallback?.remove();
    setSelectedPaymentOptionCallback = eventEmitter.addListener(
      'onCustomerAdapterSetSelectedPaymentOptionCallback',
      async ({ paymentOption }: { paymentOption: string }) => {
        await setSelectedPaymentOption(paymentOption);
        await NativeStripeSdk.customerAdapterSetSelectedPaymentOptionCallback();
      }
    );
  }

  const fetchSelectedPaymentOption = customerAdapter.fetchSelectedPaymentOption;
  if (fetchSelectedPaymentOption) {
    fetchSelectedPaymentOptionCallback?.remove();
    fetchSelectedPaymentOptionCallback = eventEmitter.addListener(
      'onCustomerAdapterFetchSelectedPaymentOptionCallback',
      async () => {
        const paymentOption = await fetchSelectedPaymentOption();
        await NativeStripeSdk.customerAdapterFetchSelectedPaymentOptionCallback(
          paymentOption
        );
      }
    );
  }

  const setupIntentClientSecretForCustomerAttach =
    customerAdapter.setupIntentClientSecretForCustomerAttach;
  if (setupIntentClientSecretForCustomerAttach) {
    setupIntentClientSecretForCustomerAttachCallback?.remove();
    setupIntentClientSecretForCustomerAttachCallback = eventEmitter.addListener(
      'onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback',
      async () => {
        const clientSecret = await setupIntentClientSecretForCustomerAttach();
        await NativeStripeSdk.customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
          clientSecret
        );
      }
    );
  }
};

/** Launches the Customer Sheet UI. */
const present = async (
  params: CustomerSheetPresentParams = {}
): Promise<CustomerSheetResult> => {
  try {
    return await NativeStripeSdk.presentCustomerSheet(params);
  } catch (error: any) {
    return {
      error,
    };
  }
};

/**
 * You can use this to obtain the selected payment method without presenting the CustomerSheet.
 * This will return an error if you have not called `.initialize`
 */
const retrievePaymentOptionSelection =
  async (): Promise<CustomerSheetResult> => {
    try {
      return await NativeStripeSdk.retrieveCustomerSheetPaymentOptionSelection();
    } catch (error: any) {
      return {
        error,
      };
    }
  };

/**
 *  Props
 */
export type Props = {
  /** Whether the sheet is visible. Defaults to false. */
  visible: boolean;
  /** Called when the user submits, dismisses, or cancels the sheet, or when an error occurs. */
  onResult: (result: CustomerSheetResult) => void;
} & CustomerSheetInitParams &
  CustomerSheetPresentParams;

/**
 * A component wrapper around the Customer Sheet functions. Upon passing `true` to the `visible` prop,
 * Customer Sheet will call `initialize` and `present`, and the result(s) will be passed through to the
 * onResult callback.
 *
 * @example
 * ```ts
 *  const [selectedPaymentOption, setSelectedPaymentOption] = React.useState(null);
 *  const [customerSheetVisible, setCustomerSheetVisible] = React.useState(false);
 *
 *  return (
 *    <CustomerSheet
 *      visible={customerSheetVisible}
 *      customerEphemeralKeySecret={ephemeralKeySecret}
 *      customerId={customer}
 *      returnURL={'stripe-example://stripe-redirect'}
 *      onResult={({ error, paymentOption, paymentMethod }) => {
 *        setCustomerSheetVisible(false);
 *        if (error) {
 *          Alert.alert(error.code, error.localizedMessage);
 *        }
 *        if (paymentOption) {
 *          setSelectedPaymentOption(paymentOption);
 *          console.log(JSON.stringify(paymentOption, null, 2));
 *        }
 *        if (paymentMethod) {
 *          console.log(JSON.stringify(paymentMethod, null, 2));
 *        }
 *      }}
 *    />
 *  );
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
function CustomerSheet({
  visible,
  presentationStyle,
  animationStyle,
  style,
  appearance,
  setupIntentClientSecret,
  customerId,
  customerEphemeralKeySecret,
  merchantDisplayName,
  headerTextForSelectionScreen,
  defaultBillingDetails,
  billingDetailsCollectionConfiguration,
  returnURL,
  removeSavedPaymentMethodMessage,
  applePayEnabled,
  googlePayEnabled,
  timeout,
  onResult,
}: Props) {
  React.useEffect(() => {
    if (visible) {
      initialize({
        style,
        appearance,
        setupIntentClientSecret,
        customerId,
        customerEphemeralKeySecret,
        merchantDisplayName,
        headerTextForSelectionScreen,
        defaultBillingDetails,
        billingDetailsCollectionConfiguration,
        returnURL,
        removeSavedPaymentMethodMessage,
        applePayEnabled,
        googlePayEnabled,
      }).then((initResult) => {
        if (initResult.error) {
          onResult(initResult);
        } else {
          present({
            timeout,
            presentationStyle,
            animationStyle,
          }).then((presentResult) => {
            onResult(presentResult);
          });
        }
      });
    }
    // Only run this hook when visible prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return null;
}

/**
 * The Customer Sheet is a prebuilt UI component that lets your customers manage their saved payment methods.
 */
export const CustomerSheetBeta = {
  CustomerSheet,
  initialize,
  present,
  retrievePaymentOptionSelection,
};
