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
  let customerAdapterOverrides = {};
  if (params.customerAdapter) {
    customerAdapterOverrides = configureCustomerAdapterEventListeners(
      params.customerAdapter
    );
  }

  try {
    const { error } = await NativeStripeSdk.initCustomerSheet(
      params,
      customerAdapterOverrides
    );
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
): { [Property in keyof CustomerAdapter]: boolean } => {
  if (customerAdapter.fetchPaymentMethods) {
    fetchPaymentMethodsCallback?.remove();
    fetchPaymentMethodsCallback = eventEmitter.addListener(
      'onCustomerAdapterFetchPaymentMethodsCallback',
      async () => {
        if (customerAdapter.fetchPaymentMethods) {
          const paymentMethods = await customerAdapter.fetchPaymentMethods();
          await NativeStripeSdk.customerAdapterFetchPaymentMethodsCallback(
            paymentMethods
          );
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `fetchPaymentMethods` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  if (customerAdapter.attachPaymentMethod) {
    attachPaymentMethodCallback?.remove();
    attachPaymentMethodCallback = eventEmitter.addListener(
      'onCustomerAdapterAttachPaymentMethodCallback',
      async ({ paymentMethodId }: { paymentMethodId: string }) => {
        if (customerAdapter.attachPaymentMethod) {
          const paymentMethod = await customerAdapter.attachPaymentMethod(
            paymentMethodId
          );
          await NativeStripeSdk.customerAdapterAttachPaymentMethodCallback(
            paymentMethod
          );
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `attachPaymentMethod` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  if (customerAdapter.detachPaymentMethod) {
    detachPaymentMethodCallback?.remove();
    detachPaymentMethodCallback = eventEmitter.addListener(
      'onCustomerAdapterDetachPaymentMethodCallback',
      async ({ paymentMethodId }: { paymentMethodId: string }) => {
        if (customerAdapter.detachPaymentMethod) {
          const paymentMethod = await customerAdapter.detachPaymentMethod(
            paymentMethodId
          );
          await NativeStripeSdk.customerAdapterDetachPaymentMethodCallback(
            paymentMethod
          );
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `detachPaymentMethod` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  if (customerAdapter.setSelectedPaymentOption) {
    setSelectedPaymentOptionCallback?.remove();
    setSelectedPaymentOptionCallback = eventEmitter.addListener(
      'onCustomerAdapterSetSelectedPaymentOptionCallback',
      async ({ paymentOption }: { paymentOption: string }) => {
        if (customerAdapter.setSelectedPaymentOption) {
          await customerAdapter.setSelectedPaymentOption(paymentOption);
          await NativeStripeSdk.customerAdapterSetSelectedPaymentOptionCallback();
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `setSelectedPaymentOption` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  if (customerAdapter.fetchSelectedPaymentOption) {
    fetchSelectedPaymentOptionCallback?.remove();
    fetchSelectedPaymentOptionCallback = eventEmitter.addListener(
      'onCustomerAdapterFetchSelectedPaymentOptionCallback',
      async () => {
        if (customerAdapter.fetchSelectedPaymentOption) {
          const paymentOption =
            await customerAdapter.fetchSelectedPaymentOption();
          await NativeStripeSdk.customerAdapterFetchSelectedPaymentOptionCallback(
            paymentOption
          );
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `fetchSelectedPaymentOption` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  if (customerAdapter.setupIntentClientSecretForCustomerAttach) {
    setupIntentClientSecretForCustomerAttachCallback?.remove();
    setupIntentClientSecretForCustomerAttachCallback = eventEmitter.addListener(
      'onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback',
      async () => {
        if (customerAdapter.setupIntentClientSecretForCustomerAttach) {
          const clientSecret =
            await customerAdapter.setupIntentClientSecretForCustomerAttach();
          await NativeStripeSdk.customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
            clientSecret
          );
        } else {
          throw new Error(
            '[@stripe/stripe-react-native] Tried to call `setupIntentClientSecretForCustomerAttach` on your CustomerAdapter, but no matching method was found.'
          );
        }
      }
    );
  }

  return {
    fetchPaymentMethods: !!customerAdapter.fetchPaymentMethods,
    attachPaymentMethod: !!customerAdapter.attachPaymentMethod,
    detachPaymentMethod: !!customerAdapter.detachPaymentMethod,
    setSelectedPaymentOption: !!customerAdapter.setSelectedPaymentOption,
    fetchSelectedPaymentOption: !!customerAdapter.fetchSelectedPaymentOption,
    setupIntentClientSecretForCustomerAttach:
      !!customerAdapter.setupIntentClientSecretForCustomerAttach,
  };
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
  customerAdapter,
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
        customerAdapter,
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
