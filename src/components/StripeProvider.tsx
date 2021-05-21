import React, { useEffect } from 'react';

import NativeStripeSdk from '../NativeStripeSdk';
import { isAndroid, shouldAttributeExpo } from '../helpers';
import type {
  AppInfo,
  ThreeDSecureConfigurationParams,
  InitStripeParams,
  InitialiseParams,
} from '../types';
import pjson from '../../package.json';

const EXPO_PARTNER_ID = 'pp_partner_JBN7LkABco2yUu';

/**
 *  Stripe Provider Component Props
 */
export interface Props {
  publishableKey: string;
  merchantIdentifier?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  stripeAccountId?: string;
  children: React.ReactElement | React.ReactElement[];
  urlScheme?: string;
  setUrlSchemeOnAndroid?: boolean;
}

const repository: any = pjson.repository;

const appInfo: AppInfo = {
  name: shouldAttributeExpo() ? `${pjson.name}/expo` : pjson.name,
  // package.json output installed via npm is a bit different than from yarn
  // the repository field can be an object or string
  // for more context: https://github.com/stripe/stripe-react-native/issues/200
  url: repository.url || repository,
  version: pjson.version,
  partnerId: shouldAttributeExpo() ? EXPO_PARTNER_ID : undefined,
};

export const initStripe = async (params: InitStripeParams): Promise<void> => {
  const extendedParams: InitialiseParams = { ...params, appInfo };
  NativeStripeSdk.initialise(extendedParams);
};

/**
 *  StripeProvider Component
 *
 * @example
 * ```ts
 *  <StripeProvider
 *    publishableKey="_publishableKey"
 *    merchantIdentifier="merchant.com.stripe.react.native"
 *    threeDSecureParams={{
 *      backgroundColor: "#FFF",
 *      timeout: 5,
 *    }}
 *  >
 *    <App />
 *  </StripeProvider>
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function StripeProvider({
  children,
  publishableKey,
  merchantIdentifier,
  threeDSecureParams,
  stripeAccountId,
  urlScheme,
  setUrlSchemeOnAndroid,
}: Props) {
  useEffect(() => {
    if (!publishableKey) {
      return;
    }
    if (isAndroid) {
      NativeStripeSdk.initialise({
        publishableKey,
        appInfo,
        stripeAccountId,
        threeDSecureParams,
        urlScheme,
        setUrlSchemeOnAndroid,
      });
    } else {
      NativeStripeSdk.initialise({
        publishableKey,
        appInfo,
        stripeAccountId,
        threeDSecureParams,
        merchantIdentifier,
        urlScheme,
      });
    }
  }, [
    publishableKey,
    merchantIdentifier,
    stripeAccountId,
    threeDSecureParams,
    urlScheme,
    setUrlSchemeOnAndroid,
  ]);

  return <>{publishableKey ? children : null}</>;
}
