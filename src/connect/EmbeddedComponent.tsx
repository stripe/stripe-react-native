import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Platform, StyleProp, ViewStyle } from 'react-native';
import type { WebView } from 'react-native-webview';
import pjson from '../../package.json';
import {
  ConnectComponentsPayload,
  useConnectComponents,
} from './ConnectComponentsProvider';
import type { LoadError, LoaderStart } from './connectTypes';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';

const DEVELOPMENT_MODE = false;
const DEVELOPMENT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const PRODUCTION_URL = 'https://connect-js.stripe.com';
const BASE_URL = DEVELOPMENT_MODE ? DEVELOPMENT_URL : PRODUCTION_URL;

const sdkVersion = pjson.version;

// react-native-webview.html will only load versions in the format X.Y.Z
if (!/^\d+\.\d+\.\d+$/.test(sdkVersion)) {
  throw new Error(
    `Invalid SDK version: ${sdkVersion}. Must be in format X.Y.Z`
  );
}

export interface CommonComponentProps {
  onLoaderStart?: ({ elementTagName }: LoaderStart) => void;
  onLoadError?: ({ error, elementTagName }: LoadError) => void;

  onPageDidLoad?: () => void;

  style?: StyleProp<ViewStyle>;
}

type EmbeddedComponentType =
  | 'invoice-history'
  | 'transactions-list'
  | 'payments'
  | 'payment-details'
  | 'payment-disputes'
  | 'payouts'
  | 'payouts-list'
  | 'balances'
  | 'account-management'
  | 'account-management-form'
  | 'account-onboarding'
  | 'disputes-list'
  | 'instant-payouts'
  | 'instant-payouts-promotion'
  | 'notification-banner'
  | 'debug-utils'
  | 'debug-ui-config'
  | 'debug-ui-library'
  | 'debug-ui-preview'
  | 'debug-components-list'
  | 'debug-hosted-dashboard-preview'
  | 'app-onboarding'
  | 'app-install'
  | 'app-viewport'
  | 'payment-method-settings'
  | 'capital-financing'
  | 'capital-financing-application'
  | 'capital-financing-promotion'
  | 'capital-overview'
  | 'terminal-hardware-orders'
  | 'terminal-hardware-shop'
  | 'app-settings'
  | 'instant-payouts-promotion'
  | 'issuing-cards-list'
  | 'issuing-card'
  | 'financial-account'
  | 'financial-account-transactions'
  | 'recipients'
  | 'product-tax-code-selector'
  | 'check-scanning'
  | 'tax-threshold-monitoring'
  | 'export-tax-transactions'
  | 'tax-settings'
  | 'tax-registrations'
  | 'documents'
  | 'earnings-chart'
  | 'reporting-chart'
  | 'payout-details'
  | 'balance-report'
  | 'payout-reconciliation-report';

type EmbeddedComponentProps = CommonComponentProps & {
  component: EmbeddedComponentType;
  componentProps?: Record<string, unknown>;

  callbacks?: Record<string, ((data: any) => void) | undefined>;
};

type ConnectComponentsPayloadInternal = ConnectComponentsPayload & {
  overrides?: Record<string, string>;
};

export function EmbeddedComponent(props: EmbeddedComponentProps) {
  const [dynamicWebview, setDynamicWebview] = useState<{
    WebView: typeof WebView | null;
  } | null>(null);

  const loadWebViewComponent = useCallback(async () => {
    if (dynamicWebview) return;

    setDynamicWebview({ WebView: null });

    try {
      const mod = await import('react-native-webview');
      setDynamicWebview({ WebView: mod.WebView });
    } catch (err) {
      console.error('Failed to import react-native-webview:', err);
    }
  }, [dynamicWebview]);

  useEffect(() => {
    loadWebViewComponent();
  }, [loadWebViewComponent]);

  // Handle deep links for authenticated webview callbacks (Android)
  useEffect(() => {
    // Listen for deep links to handle Android Custom Tabs redirects
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('stripe-connect://')) {
        console.log(`[EmbeddedComponent] Deep link received: ${url}`);
        // TODO: resolve promise
      }
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  const { connectInstance, appearance, locale, overrides } =
    useConnectComponents() as ConnectComponentsPayloadInternal;
  const { fonts, publishableKey, fetchClientSecret } =
    connectInstance.initParams;

  const {
    component,
    componentProps,
    onLoadError,
    onLoaderStart,
    onPageDidLoad,
    callbacks,
    style,
  } = props;

  const hashParams = {
    component,
    publicKey: publishableKey,
    merchantIdOverride: overrides?.merchantId,
    platformIdOverride: overrides?.platformId,
    apiKeyOverride: overrides?.apiKey,
    livemodeOverride: overrides?.livemode,
  };

  const hash = Object.entries(hashParams)
    .filter(([_, value]) => value != null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`
    )
    .join('&');

  const connectURL = `${BASE_URL}/v1.0/react_native_webview.html#${hash}`;
  const source = useMemo(() => ({ uri: connectURL }), [connectURL]);

  const ref = useRef<WebView>(null);

  const [prevAppearance, setPrevAppearance] = useState(appearance);
  const [prevLocale, setPrevLocale] = useState(locale);

  if (prevAppearance !== appearance || prevLocale !== locale) {
    setPrevAppearance(appearance);
    setPrevLocale(locale);

    ref.current?.injectJavaScript(`
      (function() {
        window.updateConnectInstance(${JSON.stringify({ appearance, locale })});
        true;
      })();
    `);
  }

  const [prevComponentProps, setPrevComponentProps] = useState(componentProps);
  if (prevComponentProps !== componentProps) {
    setPrevComponentProps(componentProps);

    Object.entries(componentProps || {}).forEach(([key, value]) => {
      ref.current?.injectJavaScript(`
        (function() {
          window.callSetterWithSerializableValue(${JSON.stringify({
            setter: key,
            value,
          })});
          true;
        })();
      `);
    });
  }

  const handleUnexpectedError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error: ${errorMessage}`);
  }, []);

  const WebViewComponent = dynamicWebview?.WebView;

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      ref={ref}
      style={style}
      webviewDebuggingEnabled={DEVELOPMENT_MODE}
      source={source}
      userAgent={`Mobile - Stripe ReactNative SDK ${Platform.OS}/${Platform.Version} - stripe-react_native/${sdkVersion}`}
      injectedJavaScriptObject={{
        initParams: {
          appearance,
          locale,
          fonts,
        },
        initComponentProps: componentProps,
        appInfo: { applicationId: overrides?.applicationId },
      }}
      // Fixes injectedJavaScriptObject in Android https://github.com/react-native-webview/react-native-webview/issues/3326#issuecomment-3048111789
      injectedJavaScriptBeforeContentLoaded={'(function() {})();'}
      onMessage={async (event) => {
        const message = JSON.parse(event.nativeEvent.data) as {
          type: string;
          data?: unknown;
        };

        if (message.type === 'fetchClientSecret') {
          const clientSecret = await fetchClientSecret().catch((error) => {
            handleUnexpectedError(error);
            return null;
          });
          if (!clientSecret) return;

          ref.current?.injectJavaScript(`
            window.clientSecretDeferred.resolve(${JSON.stringify(
              clientSecret
            )});
          `);
        } else if (message.type === 'debug') {
          // message.data is of type string
          console.debug(`[EmbeddedComponent ${component}]: ${message.data}`);
        } else if (message.type === 'pageDidLoad') {
          onPageDidLoad?.();
        } else if (message.type === 'accountSessionClaimed') {
          // message.data is of type {elementTagName: string, merchantId: string}
        } else if (message.type === 'openFinancialConnections') {
          // message.data is of type {clientSecret: string; id: string; connectedAccountId: string;}
        } else if (message.type === 'closeWebView') {
          // message.data is empty
          callbacks?.onCloseWebView?.({});
        } else if (message.type === 'callSupplementalFunction') {
          // message.data is of type {[key]: {functionName: string; args: unknown[]; invocationId: string;}}
        } else if (message.type === 'onSetterFunctionCalled') {
          const { setter, value } = message.data as {
            setter: string;
            value: unknown;
          };

          if (setter === 'setOnLoaderStart') {
            onLoaderStart?.(value as LoaderStart);
          } else if (setter === 'setOnLoadError') {
            onLoadError?.(value as LoadError);
          } else {
            // remove the 'set' prefix and lowercase the first letter
            const functionName =
              setter.charAt(3).toLowerCase() + setter.substring(4);
            callbacks?.[functionName]?.(value);
          }
        } else if (message.type === 'openAuthenticatedWebView') {
          const { url, id } = message.data as { id: string; url: string };

          NativeStripeSdk.openAuthenticatedWebView(id, url)
            .then((result) => {
              // TODO: on Android this resolves immediately, but we should wait
              // for the deep link to be opened and get the URL from there
              ref.current?.injectJavaScript(`
                (function() {
                  window.returnedFromAuthenticatedWebView(${JSON.stringify({
                    id,
                    url: result?.url ?? null,
                  })});
                  true;
                })();
              `);
            })
            .catch(handleUnexpectedError);
        } else {
          // unhandled message
        }
      }}
    />
  );
}
