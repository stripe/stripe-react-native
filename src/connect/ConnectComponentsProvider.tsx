import React, { JSX, useMemo, useState } from 'react';
import type {
  StripeConnectInitParams,
  StripeConnectUpdateParams,
  LoadConnectAndInitialize,
  StripeConnectInstance,
} from './connectTypes';

class ConnectInstance implements StripeConnectInstance {
  initParams: StripeConnectInitParams;
  onUpdate?: (options: StripeConnectUpdateParams) => void;

  constructor(initParams: StripeConnectInitParams) {
    this.initParams = initParams;
  }

  update(options: StripeConnectUpdateParams): void {
    this.onUpdate?.(options);
  }
}

export const loadConnectAndInitialize: LoadConnectAndInitialize = (
  initParams: StripeConnectInitParams
): StripeConnectInstance => {
  return new ConnectInstance(initParams);
};

type ConnectComponentsProviderProps = {
  connectInstance: StripeConnectInstance;
  children: React.ReactNode;
};

export type ConnectComponentsPayload = {
  appearance: StripeConnectInitParams['appearance'];
  locale: StripeConnectInitParams['locale'];
  connectInstance: ConnectInstance;
};

const ConnectComponentsContext =
  React.createContext<ConnectComponentsPayload | null>(null);

ConnectComponentsContext.displayName = 'ConnectComponents';

export const ConnectComponentsProvider = ({
  children,
  connectInstance,
}: ConnectComponentsProviderProps): JSX.Element => {
  if (!(connectInstance instanceof ConnectInstance)) {
    throw new Error(
      'connectInstance must be an instance of ConnectInstance created via loadConnectAndInitialize'
    );
  }

  const [appearance, setAppearance] = useState<
    StripeConnectInitParams['appearance']
  >(connectInstance.initParams.appearance);

  const [locale, setLocale] = useState<StripeConnectInitParams['locale']>(
    connectInstance.initParams.locale
  );

  if (!connectInstance.onUpdate) {
    connectInstance.onUpdate = (options: StripeConnectUpdateParams) => {
      if (options.appearance) {
        setAppearance(options.appearance);
      }
      if (options.locale) {
        setLocale(options.locale);
      }
    };
  }

  const value = useMemo(
    () => ({ connectInstance, locale, appearance }),
    [connectInstance, locale, appearance]
  );

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
