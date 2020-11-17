import React from 'react';

export interface StripeProviderContextShape {
  cardDetails: any;
}

export const StripeContext = React.createContext<StripeProviderContextShape>({
  cardDetails: null,
});

export const StripeContextProvider = StripeContext.Provider;
export const StripeContextConsumer = StripeContext.Consumer;
