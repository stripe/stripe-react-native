import React, { useEffect } from 'react';
import { StripeContextProvider } from './StripeContext';

import NativeStripeSdk from './NativeStripeSdk';

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

    NativeStripeSdk.initialise(publishableKey, merchantIdentifier);
  }, [publishableKey, merchantIdentifier]);

  return (
    <StripeContextProvider value={{ publishableKey, cardDetails: {} }}>
      {children}
    </StripeContextProvider>
  );
};
