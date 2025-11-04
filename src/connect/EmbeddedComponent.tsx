import type { LoadError, LoaderStart } from '@stripe/connect-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import type { WebView } from 'react-native-webview';
import { useConnectComponents } from './ConnectComponentsProvider';
import pjson from '../../package.json';

const DEVELOPMENT_MODE = true;
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

  const {
    publishableKey,
    fetchClientSecret,
    appearance,
    locale,
    fonts,
    overrides,
  } = useConnectComponents();

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

  const ref = useRef<WebView>(null);

  const [prevAppearance, setPrevAppearance] = React.useState(appearance);
  if (prevAppearance !== appearance) {
    setPrevAppearance(appearance);

    ref.current?.injectJavaScript(`
      (function() {
        window.updateConnectInstance(${JSON.stringify({ appearance })});
        true;
      })();
    `);
  }

  const [prevLocale, setPrevLocale] = React.useState(locale);
  if (prevLocale !== locale) {
    setPrevLocale(locale);

    ref.current?.injectJavaScript(`
      (function() {
        window.updateConnectInstance(${JSON.stringify({ locale })});
        true;
      })();
    `);
  }

  const [prevFonts, setPrevFonts] = React.useState(fonts);
  if (prevFonts !== fonts) {
    setPrevFonts(fonts);

    ref.current?.injectJavaScript(`
      (function() {
        window.updateConnectInstance(${JSON.stringify({ fonts })});
        true;
      })();
    `);
  }

  const [prevComponentProps, setPrevComponentProps] =
    React.useState(componentProps);
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

  const WebViewComponent = dynamicWebview?.WebView;

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      ref={ref}
      style={style}
      webviewDebuggingEnabled={DEVELOPMENT_MODE}
      source={{ uri: connectURL }}
      userAgent={`Mobile - Stripe ReactNative SDK ${Platform.OS}/${Platform.Version} - stripe-react_native/${sdkVersion}`}
      injectedJavaScriptObject={{
        initParams: {
          appearance,
          locale,
          fonts,
        },
        initComponentProps: componentProps,
        appInfo: { applicationId: undefined },
      }}
      // Fixes injectedJavaScriptObject in Android https://github.com/react-native-webview/react-native-webview/issues/3326#issuecomment-3048111789
      injectedJavaScriptBeforeContentLoaded={'(function() {})();'}
      onMessage={async (event) => {
        const message = JSON.parse(event.nativeEvent.data) as {
          type: string;
          data?: unknown;
        };

        if (message.type === 'fetchClientSecret') {
          const clientSecret = await fetchClientSecret();
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
          console.log('closeWebView');
        } else if (message.type === 'callSupplementalFunction') {
          console.log('message:', message);
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
          // message.data is of type {id: string; url: string}
        } else {
          // unhandled message
        }
      }}
    />
  );
}
