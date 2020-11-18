import React, { useEffect } from 'react';
import { StripeContextProvider } from './StripeContext';

import NativeStripeSdk from './NativeStripeSdk';

type Props = {
  publishableKey: string;
};

export const StripeProvider: React.FC<Props> = ({
  children,
  publishableKey,
}) => {
  useEffect(() => {
    if (publishableKey === '') {
      return;
    }

    NativeStripeSdk.initialise(publishableKey);
  }, [publishableKey]);

  return (
    <StripeContextProvider value={{ publishableKey, cardDetails: {} }}>
      {children}
    </StripeContextProvider>
  );
};
