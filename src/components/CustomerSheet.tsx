import React from 'react';
import type {
  CustomerSheetInitParams,
  CustomerSheetPresentParams,
  CustomerSheetResult,
} from '../types';
import { initCustomerSheet, presentCustomerSheet } from '../functions';

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
 *
 *
 * @example
 * ```ts
 *  <CustomerSheet
 *
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function CustomerSheet({
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
      initCustomerSheet({
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
          presentCustomerSheet({
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
