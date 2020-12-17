import React, { useEffect } from 'react';

import NativeStripeSdk from '../NativeStripeSdk';
import { isAndroid } from '../helpers';
import type { ThreeDSecureConfigurationParams } from '../types';
import type { AppInfo } from '../types';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  appInfo?: AppInfo;
  stripeAccountId?: string;
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
  merchantIdentifier,
  threeDSecureParams,
  appInfo = {},
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
  }, [
    publishableKey,
    merchantIdentifier,
    appInfo,
    stripeAccountId,
    threeDSecureParams,
  ]);

  return <>{children}</>;
};
