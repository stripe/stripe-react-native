import React from 'react';
import { StripeContextProvider } from './StripeContext';

type Props = {
  publishableKey: string;
};

export const StripeProvider: React.FC<Props> = ({ children }) => {
  const cardDetails = {};
  return (
    <StripeContextProvider value={{ cardDetails }}>
      {children}
    </StripeContextProvider>
  );
};
