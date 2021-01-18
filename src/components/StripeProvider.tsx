import React, { useEffect } from 'react';

import NativeStripeSdk from '../NativeStripeSdk';
import { isAndroid } from '../helpers';
import type { AppInfo, ThreeDSecureConfigurationParams } from '../types';
import pjson from '../../package.json';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  stripeAccountId?: string;
};

const appInfo: AppInfo = {
  name: 'stripe-react-native',
  url: 'https://github.com/stripe/stripe-react-native',
  version: pjson.version,
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
  merchantIdentifier,
  threeDSecureParams,
  stripeAccountId,
}) => {
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
};
