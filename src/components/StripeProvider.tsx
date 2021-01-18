import React, { useEffect } from 'react';

import NativeStripeSdk from '../NativeStripeSdk';
import { isAndroid } from '../helpers';
import type { ThreeDSecureConfigurationParams } from '../types';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
  threeDSecureParams?: ThreeDSecureConfigurationParams;
  stripeAccountId?: string;
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
        stripeAccountId,
        threeDSecureParams
      );
    } else {
      NativeStripeSdk.initialise(
        publishableKey,
        stripeAccountId,
        threeDSecureParams,
        merchantIdentifier
      );
    }
  }, [publishableKey, merchantIdentifier, stripeAccountId, threeDSecureParams]);

  return <>{children}</>;
};
