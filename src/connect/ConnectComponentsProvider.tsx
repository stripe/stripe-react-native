import React, { JSX, useMemo } from 'react';
import type { IStripeConnectInitParams } from './connectTypes';

type ConnectComponentsPayload = {
  publishableKey: string;
  fetchClientSecret: IStripeConnectInitParams['fetchClientSecret'];
  appearance?: IStripeConnectInitParams['appearance'];
  locale?: IStripeConnectInitParams['locale'];
  fonts?: IStripeConnectInitParams['fonts'];
  overrides?: Record<string, string>;
};

const ConnectComponentsContext =
  React.createContext<ConnectComponentsPayload | null>(null);

ConnectComponentsContext.displayName = 'ConnectComponents';

export const ConnectComponentsProvider = ({
  children,
  ...props
}: ConnectComponentsPayload & {
  children: React.ReactNode;
}): JSX.Element => {
  const value = useMemo(() => ({ ...props }), [props]);

  return (
    <ConnectComponentsContext.Provider value={value}>
      {children}
    </ConnectComponentsContext.Provider>
  );
};

export const useConnectComponents = (): ConnectComponentsPayload => {
  const context = React.useContext(ConnectComponentsContext);
  if (!context) {
    throw new Error(
      `Could not find a ConnectComponentsContext; You need to wrap your components in an <ConnectComponentsProvider> provider.`
    );
  }
  return context;
};
