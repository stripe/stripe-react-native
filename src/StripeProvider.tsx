import React, { useEffect } from 'react';
import { StripeContextProvider } from './StripeContext';

import NativeStripeSdk from './NativeStripeSdk';
import { isAndroid } from './platform';
import type { AppInfo } from './types';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
  appInfo?: AppInfo;
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
  merchantIdentifier,
  appInfo = {},
}) => {
  useEffect(() => {
    if (publishableKey === '') {
      return;
    }
    if (isAndroid) {
      NativeStripeSdk.initialise(publishableKey, appInfo);
    } else {
      NativeStripeSdk.initialise(publishableKey, appInfo, merchantIdentifier);
    }
  }, [publishableKey, merchantIdentifier, appInfo]);

  return (
    <StripeContextProvider value={{ publishableKey, cardDetails: {} }}>
      {children}
    </StripeContextProvider>
  );
};
