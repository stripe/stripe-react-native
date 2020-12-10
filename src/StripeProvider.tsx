import React, { useEffect } from 'react';
import { StripeContextProvider } from './StripeContext';

import NativeStripeSdk from './NativeStripeSdk';
import { isAndroid } from './platform';
import type { AppInfo } from './types';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
  appInfo?: AppInfo;
  stripeAccountId?: string;
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
  merchantIdentifier,
  appInfo = {},
  stripeAccountId,
}) => {
  useEffect(() => {
    if (publishableKey === '') {
      return;
    }
    if (isAndroid) {
      NativeStripeSdk.initialise(publishableKey, appInfo, stripeAccountId);
    } else {
      NativeStripeSdk.initialise(
        publishableKey,
        appInfo,
        stripeAccountId,
        merchantIdentifier
      );
    }
  }, [publishableKey, merchantIdentifier, appInfo, stripeAccountId]);

  return (
    <StripeContextProvider value={{ publishableKey, cardDetails: {} }}>
      {children}
    </StripeContextProvider>
  );
};
