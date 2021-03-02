import React, { useEffect } from 'react';

import NativeStripeSdk from '../NativeStripeSdk';
import { isAndroid } from '../helpers';
import type { AppInfo, ThreeDSecureConfigurationParams } from '../types';
import pjson from '../../package.json';

/**
 *  Stripe Provider Component Props
 */
export interface Props {
  publishableKey: string;
  merchantIdentifier?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  stripeAccountId?: string;
  children: React.ReactElement | React.ReactElement[];
}

const appInfo: AppInfo = {
  name: pjson.name,
  url: pjson.repository,
  version: pjson.version,
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
}: Props) {
  useEffect(() => {
    if (publishableKey === '') {
      return;
    }
    if (isAndroid) {
      NativeStripeSdk.initialise(
        publishableKey,
        appInfo,
        stripeAccountId,
        threeDSecureParams
      );
    } else {
      NativeStripeSdk.initialise(
        publishableKey,
        appInfo,
        stripeAccountId,
        threeDSecureParams,
        merchantIdentifier
      );
    }
  }, [publishableKey, merchantIdentifier, stripeAccountId, threeDSecureParams]);

  return <>{children}</>;
}
