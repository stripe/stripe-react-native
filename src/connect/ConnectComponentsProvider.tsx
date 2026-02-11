import React, { JSX, useMemo, useState } from 'react';
import type {
  StripeConnectInitParams,
  StripeConnectUpdateParams,
  LoadConnectAndInitialize,
  StripeConnectInstance,
} from './connectTypes';
import { AnalyticsClient } from './analytics/AnalyticsClient';
import { Constants } from '../functions';

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

/**
 * Creates a Connect instance for use with ConnectComponentsProvider.
 * This instance manages the configuration and state for Connect embedded components.
 *
 * @param initParams - Initialization parameters including publishableKey and fetchClientSecret
 * @returns A StripeConnectInstance that can be passed to ConnectComponentsProvider
 *
 * @example
 * ```ts
 * const connectInstance = loadConnectAndInitialize({
 *   publishableKey: 'pk_test_123',
 *   fetchClientSecret: async () => {
 *     const response = await fetch('/account_session');
 *     const { client_secret } = await response.json();
 *     return client_secret;
 *   },
 *   appearance: {
 *     variables: { colorPrimary: '#635BFF' }
 *   }
 * });
 * ```
 * @category Connect
 */
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
  analyticsClient: AnalyticsClient;
};

const ConnectComponentsContext =
  React.createContext<ConnectComponentsPayload | null>(null);

ConnectComponentsContext.displayName = 'ConnectComponents';

/**
 * Context provider that makes Connect instance configuration available to embedded components.
 * Wrap your Connect components with this provider to enable them to access the shared configuration.
 *
 * @param props.connectInstance - Instance created via loadConnectAndInitialize
 * @param props.children - React components to render within the provider
 * @returns JSX.Element
 *
 * @throws Error if connectInstance is not created via loadConnectAndInitialize
 *
 * @example
 * ```tsx
 * function App() {
 *   const [connectInstance] = useState(() => {
 *     const fetchClientSecret = async () => {
 *       const response = await fetch('/account_session', { method: "POST" });
 *       const { client_secret: clientSecret } = await response.json();
 *       return clientSecret;
 *     };
 *
 *     return loadConnectAndInitialize({
 *       publishableKey: 'pk_test_123',
 *       fetchClientSecret: fetchClientSecret,
 *       appearance,
 *     });
 *   });
 *
 *   return (
 *     <ConnectComponentsProvider connectInstance={connectInstance}>
 *       <ConnectPayouts />
 *     </ConnectComponentsProvider>
 *   );
 * }
 * ```
 * @category Connect
 */
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

  // Initialize analytics client with native system info
  const analyticsClient = useMemo(() => {
    return new AnalyticsClient(Constants.SYSTEM_INFO);
  }, []);

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
    () => ({ connectInstance, locale, appearance, analyticsClient }),
    [connectInstance, locale, appearance, analyticsClient]
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
