import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import pjson from '../../package.json';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import { useConnectComponents } from './ConnectComponentsProvider';
import type {
  LoadError,
  LoaderStart,
  StripeConnectInitParams,
} from './connectTypes';

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

const userAgent = [
  'Mobile',
  `Stripe ReactNative SDK ${Platform.OS}/${Platform.Version}`,
  `stripe-react_native/${sdkVersion}`,
].join(' - ');

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

type StripeConnectInitParamsInternal = StripeConnectInitParams & {
  overrides?: Record<string, string>;
};

export function EmbeddedComponent(props: EmbeddedComponentProps) {
  const [dynamicWebview, setDynamicWebview] = useState<{
    WebView: typeof WebView | null;
  } | null>(null);

  // Store pending authenticated webview promise (for Android Custom Tabs)
  const pendingAuthWebViewPromise = useRef<{
    id: string;
    callback: (id: string, url: string | null) => void;
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

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (pendingAuthWebViewPromise.current) {
          const { id, callback } = pendingAuthWebViewPromise.current;
          pendingAuthWebViewPromise.current = null;
          callback(id, null);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      pendingAuthWebViewPromise.current = null;
      subscription.remove();
    };
  }, []);

  const { connectInstance, appearance, locale } = useConnectComponents();
  const { fonts, publishableKey, fetchClientSecret, overrides } =
    connectInstance.initParams as StripeConnectInitParamsInternal;

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

    const patchedAppearance = withDefaultFontFamily(appearance);

    ref.current?.injectJavaScript(`
      (function() {
        window.updateConnectInstance(${JSON.stringify({ appearance: patchedAppearance, locale })});
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

  const handleAuthWebViewResult = (id: string, resultUrl: string | null) => {
    ref.current?.injectJavaScript(`
      (function() {
        window.returnedFromAuthenticatedWebView(${JSON.stringify({
          id,
          url: resultUrl,
        })});
        true;
      })();
    `);
  };

  const onMessageCallback = useCallback(
    async (event: WebViewMessageEvent) => {
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

        // Validate URL before opening
        if (!isValidUrl(url)) {
          handleUnexpectedError(
            new Error(`Invalid URL for authenticated webview: ${url}`)
          );
          return;
        }

        // On Android, we need to wait for the deep link callback
        // On iOS, the promise resolves with the redirect URL
        NativeStripeSdk.openAuthenticatedWebView(id, url)
          .then((result) => {
            if (Platform.OS === 'ios') {
              // iOS returns the redirect URL directly
              handleAuthWebViewResult(id, result?.url ?? null);
            } else {
              // Android: Store promise to be resolved by deep link listener
              pendingAuthWebViewPromise.current = {
                id,
                callback: handleAuthWebViewResult,
              };
            }
          })
          .catch(handleUnexpectedError);
      } else {
        // unhandled message
      }
    },
    [
      callbacks,
      component,
      fetchClientSecret,
      handleUnexpectedError,
      onLoadError,
      onLoaderStart,
      onPageDidLoad,
    ]
  );

  const backgroundColor = appearance?.variables?.colorBackground || '#FFFFFF';

  const mergedStyle = useMemo(
    () => [{ backgroundColor }, style],
    [backgroundColor, style]
  );

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      ref={ref}
      style={mergedStyle}
      webviewDebuggingEnabled={DEVELOPMENT_MODE}
      source={source}
      userAgent={userAgent}
      injectedJavaScriptObject={{
        initParams: {
          appearance: withDefaultFontFamily(appearance),
          locale,
          fonts,
        },
        initComponentProps: componentProps,
        appInfo: { applicationId: overrides?.applicationId },
      }}
      // Fixes injectedJavaScriptObject in Android https://github.com/react-native-webview/react-native-webview/issues/3326#issuecomment-3048111789
      injectedJavaScriptBeforeContentLoaded={'(function() {})();'}
      onMessage={onMessageCallback}
    />
  );
}

const DEFAULT_FONT =
  "-apple-system, 'system-ui', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

// Returns appearance with fontFamily set if not defined
function withDefaultFontFamily(appearance: any) {
  if (appearance?.variables?.fontFamily) {
    return appearance;
  }
  return {
    ...appearance,
    variables: {
      ...appearance?.variables,
      fontFamily: DEFAULT_FONT,
    },
  };
}

// Validates that a URL is well-formed and uses http or https protocol
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}
