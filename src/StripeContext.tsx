import React from 'react';

export interface StripeProviderContextShape {
  publishableKey: string | null;
  cardDetails: any;
}

export const StripeContext = React.createContext<StripeProviderContextShape>({
  publishableKey: null,
  cardDetails: null,
});

export const StripeContextProvider = StripeContext.Provider;
export const StripeContextConsumer = StripeContext.Consumer;
