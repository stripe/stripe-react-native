import React, { useEffect } from 'react';
import { StripeContextProvider } from './StripeContext';

import NativeStripeSdk from './NativeStripeSdk';
import { Platform } from 'react-native';

type Props = {
  publishableKey: string;
  merchantIdentifier?: string;
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
  merchantIdentifier,
}) => {
  useEffect(() => {
    if (publishableKey === '') {
      return;
    }
    if (Platform.OS === 'android') {
      NativeStripeSdk.initialise(publishableKey);
    } else {
      NativeStripeSdk.initialise(publishableKey, merchantIdentifier);
    }
  }, [publishableKey, merchantIdentifier]);

  return (
    <StripeContextProvider value={{ publishableKey, cardDetails: {} }}>
      {children}
    </StripeContextProvider>
  );
};
