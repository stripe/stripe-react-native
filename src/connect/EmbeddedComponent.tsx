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
  Linking,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import type { EventSubscription } from 'react-native';
import pjson from '../../package.json';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import { addListener } from '../events';
import { useConnectComponents } from './ConnectComponentsProvider';
import type {
  LoadError,
  LoaderStart,
  StripeConnectInitParams,
} from './connectTypes';
import type { FinancialConnections } from '../types';
import { ComponentAnalyticsClient } from './analytics/ComponentAnalyticsClient';

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

// Required for ua-parser-js to detect mobile platforms correctly
const platformPrefix = Platform.select({
  ios: 'iPhone',
  android: 'Android',
  default: 'Mobile',
});
const userAgent = [
  platformPrefix,
  `Stripe ReactNative SDK ${Platform.OS}/${Platform.Version}`,
  `stripe-react_native/${sdkVersion}`,
].join(' - ');

// Allowed domains for in-WebView navigation (matching iOS SDK behavior)
const ALLOWED_STRIPE_HOSTS = [
  'connect-js.stripe.com',
  'connect.stripe.com',
  'verify.stripe.com',
  ...(DEVELOPMENT_MODE ? ['10.0.2.2:3001', 'localhost:3001'] : []),
];

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

  // Store pending authenticated webview promises (for Android Custom Tabs)
  // Multiple auth webviews can be opened simultaneously, so we need a Map
  const pendingAuthWebViewPromises = useRef<
    Map<
      string,
      {
        callback: (id: string, url: string | null) => void;
        timeoutId?: NodeJS.Timeout;
      }
    >
  >(new Map());

  // Store pending Financial Connections promise
  const pendingFinancialConnectionsPromise = useRef<{
    id: string;
    cleanup: () => void;
  } | null>(null);

  // Track recently handled URLs to prevent duplicate processing
  // This is needed because the SDK uses dual delivery paths (setIntent + direct emit)
  const recentlyHandledUrls = useRef<Set<string>>(new Set());

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

  // Deep link handler for Android auth webview (Custom Tabs redirect)
  // Uses polling to avoid broadcasting to Expo Router which causes screen dismissal
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Poll for pending URLs every 500ms when auth is active
    const pollInterval = setInterval(async () => {
      if (pendingAuthWebViewPromises.current.size === 0) {
        return;
      }

      try {
        const pendingUrls =
          await NativeStripeSdk.pollPendingStripeConnectUrls();

        if (pendingUrls && pendingUrls.length > 0) {
          pendingUrls.forEach((url: string) => {
            if (url.startsWith('stripe-connect://')) {
              // Deduplication: Skip if we've handled this exact URL
              if (recentlyHandledUrls.current.has(url)) {
                return;
              }

              // Mark as handled
              recentlyHandledUrls.current.add(url);

              // Clear from the set after 1 second
              setTimeout(() => {
                recentlyHandledUrls.current.delete(url);
              }, 1000);

              const firstEntry = pendingAuthWebViewPromises.current
                .entries()
                .next().value;

              if (firstEntry) {
                const [id, promiseData] = firstEntry;

                // Clear the timeout if it exists
                if (promiseData.timeoutId) {
                  clearTimeout(promiseData.timeoutId);
                }

                // Remove from Map and invoke callback
                pendingAuthWebViewPromises.current.delete(id);
                promiseData.callback(id, url);

                // Reset the Android flag
                NativeStripeSdk.authWebViewDeepLinkHandled(id).catch(
                  (error) => {
                    console.error(
                      '[EmbeddedComponent] Error resetting auth webview flag:',
                      error
                    );
                  }
                );
              }
            }
          });
        }
      } catch (error) {
        console.error('[EmbeddedComponent] Error polling for URLs:', error);
      }
    }, 500);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (pendingAuthWebViewPromises.current.size > 0) {
          // Give the deep link handler time to process the URL
          // If no deep link arrives within 500ms, assume the user cancelled
          pendingAuthWebViewPromises.current.forEach((promiseData, id) => {
            // Only set timeout if one doesn't already exist
            if (!promiseData.timeoutId) {
              const timeoutId = setTimeout(() => {
                const stillPending = pendingAuthWebViewPromises.current.get(id);
                if (stillPending) {
                  pendingAuthWebViewPromises.current.delete(id);
                  stillPending.callback(id, null);
                }
              }, 500);

              // Store the timeout ID so we can clear it later if needed
              promiseData.timeoutId = timeoutId;
            }
          });
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      // Clear all pending timeouts and promises
      // We intentionally want the latest ref value at cleanup time
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const promises = pendingAuthWebViewPromises.current;
      promises.forEach((promiseData, _id) => {
        if (promiseData.timeoutId) {
          clearTimeout(promiseData.timeoutId);
        }
      });
      promises.clear();
      pendingFinancialConnectionsPromise.current?.cleanup();
      subscription.remove();
    };
  }, []);

  const { connectInstance, appearance, locale, analyticsClient } =
    useConnectComponents();
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

  // Initialize component analytics client
  const componentAnalytics = useMemo(
    () =>
      new ComponentAnalyticsClient(analyticsClient, {
        publishableKey,
        platformId: overrides?.platformId,
        merchantId: overrides?.merchantId,
        livemode:
          typeof overrides?.livemode === 'boolean'
            ? overrides.livemode
            : publishableKey?.startsWith('pk_live_'),
        component,
      }),
    [analyticsClient, publishableKey, overrides, component]
  );

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
  const hasTriedSourceReload = useRef(false);

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

  // Workaround for react-native-webview new architecture bug on iOS
  // https://github.com/react-native-webview/react-native-webview/pull/3880
  // The source prop doesn't get set properly on iOS with new architecture,
  // so we force reload after the component mounts
  useEffect(() => {
    if (
      Platform.OS === 'ios' &&
      !hasTriedSourceReload.current &&
      WebViewComponent &&
      ref.current
    ) {
      hasTriedSourceReload.current = true;
      // Force reload after mount to ensure source is set
      const timer = setTimeout(() => {
        ref.current?.reload();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [WebViewComponent]);

  // Track component lifecycle events
  useEffect(() => {
    // Log component created
    componentAnalytics.logComponentCreated();
  }, [componentAnalytics]);

  // Track component viewed (when web view is visible)
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const handleLayout = useCallback(() => {
    if (!hasBeenViewed) {
      setHasBeenViewed(true);
      componentAnalytics.logComponentViewed();
    }
  }, [hasBeenViewed, componentAnalytics]);

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

  const handleFinancialConnectionsResult = (
    id: string,
    result: {
      session?: FinancialConnections.Session;
      token?: FinancialConnections.BankAccountToken;
      error?: {
        code: string;
        message: string;
        localizedMessage?: string;
        type?: string;
      };
    }
  ) => {
    ref.current?.injectJavaScript(`
      (function() {
        window.callSetterWithSerializableValue(${JSON.stringify({
          setter: 'setCollectMobileFinancialConnectionsResult',
          value: {
            id: id,
            financialConnectionsSession: result.session
              ? {
                  accounts: result.session.accounts,
                }
              : null,
            token: result.token ?? null,
            error: result.error ?? null,
          },
        })});
        true;
      })();
    `);
  };

  const onMessageCallback = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: { type: string; data?: unknown };
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch (error) {
        componentAnalytics.logDeserializeMessageError(
          'unknown',
          error instanceof Error ? error : new Error(String(error))
        );
        return;
      }

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
        const pageViewId = (message.data as { pageViewId?: string })
          ?.pageViewId;
        componentAnalytics.logComponentWebPageLoaded(pageViewId);
        onPageDidLoad?.();
      } else if (message.type === 'componentLoaded') {
        // Connect JS fully initialized
        componentAnalytics.logComponentLoaded();
      } else if (message.type === 'accountSessionClaimed') {
        // message.data is of type {elementTagName: string, merchantId: string}
      } else if (message.type === 'openFinancialConnections') {
        const messageData = message.data as {
          clientSecret: string;
          id: string;
          connectedAccountId: string;
        };

        const { clientSecret, id, connectedAccountId } = messageData;

        // Validate client secret
        if (!clientSecret || typeof clientSecret !== 'string') {
          handleFinancialConnectionsResult(id, {
            error: {
              code: 'InvalidClientSecret',
              message: 'Invalid or missing clientSecret parameter',
            },
          });
          return;
        }

        // Prevent multiple simultaneous flows
        if (pendingFinancialConnectionsPromise.current) {
          handleFinancialConnectionsResult(id, {
            error: {
              code: 'AlreadyInProgress',
              message: 'Financial Connections flow already in progress',
            },
          });
          return;
        }

        // Setup event listener for debugging
        let eventListener: EventSubscription | null = null;
        if (__DEV__) {
          eventListener = addListener(
            'onFinancialConnectionsEvent',
            (fcEvent: FinancialConnections.FinancialConnectionsEvent) => {
              console.debug(
                `[FinancialConnections ${component}]: ${fcEvent.name}`,
                fcEvent.metadata
              );
            }
          );
        }

        // Store cleanup function
        const cleanup = () => {
          eventListener?.remove();
          pendingFinancialConnectionsPromise.current = null;
        };

        pendingFinancialConnectionsPromise.current = {
          id,
          cleanup,
        };

        // Call native Financial Connections
        NativeStripeSdk.collectFinancialConnectionsAccounts(clientSecret, {
          connectedAccountId,
        })
          .then(({ session, error }) => {
            cleanup();

            if (error) {
              handleFinancialConnectionsResult(id, {
                session: undefined,
                token: undefined,
                error: {
                  code: error.code,
                  message: error.message,
                  localizedMessage: error.localizedMessage,
                  type: error.type,
                },
              });
            } else if (session) {
              // Note: collectFinancialConnectionsAccounts doesn't return a token
              // Only collectBankAccountToken returns both session and token
              handleFinancialConnectionsResult(id, {
                session,
                token: undefined,
                error: undefined,
              });
            } else {
              // Defensive: should never happen
              handleFinancialConnectionsResult(id, {
                error: {
                  code: 'UnexpectedError',
                  message:
                    'No session or error returned from Financial Connections',
                },
              });
            }
          })
          .catch((unexpectedError) => {
            cleanup();
            handleUnexpectedError(unexpectedError);
            handleFinancialConnectionsResult(id, {
              error: {
                code: 'UnexpectedError',
                message:
                  unexpectedError instanceof Error
                    ? unexpectedError.message
                    : 'An unexpected error occurred during Financial Connections',
              },
            });
          });
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
          if (callbacks?.[functionName]) {
            callbacks[functionName](value);
          } else {
            // Unrecognized setter function
            componentAnalytics.logUnrecognizedSetter(setter);
          }
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

        // Log authenticated web view opened
        componentAnalytics.logAuthenticatedWebViewOpened(id);

        // On Android, we need to wait for the deep link callback
        // On iOS, the promise resolves with the redirect URL
        NativeStripeSdk.openAuthenticatedWebView(id, url)
          .then((result) => {
            if (Platform.OS === 'ios') {
              // iOS returns the redirect URL directly
              const resultUrl = result?.url ?? null;
              if (resultUrl) {
                componentAnalytics.logAuthenticatedWebViewRedirected(id);
              } else {
                componentAnalytics.logAuthenticatedWebViewCanceled(id);
              }
              handleAuthWebViewResult(id, resultUrl);
            } else {
              // Android: Store promise in Map to be resolved by deep link listener
              pendingAuthWebViewPromises.current.set(id, {
                callback: (authId: string, resultUrl: string | null) => {
                  if (resultUrl) {
                    componentAnalytics.logAuthenticatedWebViewRedirected(
                      authId
                    );
                  } else {
                    componentAnalytics.logAuthenticatedWebViewCanceled(authId);
                  }
                  handleAuthWebViewResult(authId, resultUrl);
                },
              });
            }
          })
          .catch((error) => {
            console.error(
              `[EmbeddedComponent] Error opening authenticated webview:`,
              error
            );
            componentAnalytics.logAuthenticatedWebViewError(
              id,
              error instanceof Error ? error : new Error(String(error))
            );
            handleUnexpectedError(error);
          });
      } else {
        // unhandled message
      }
    },
    [
      callbacks,
      component,
      componentAnalytics,
      fetchClientSecret,
      handleUnexpectedError,
      onLoadError,
      onLoaderStart,
      onPageDidLoad,
    ]
  );

  const onShouldStartLoadWithRequest = useCallback(
    (event: ShouldStartLoadRequest) => {
      const { url, navigationType } = event;

      // Handle CSV export downloads
      if (isCsvExportUrl(url)) {
        NativeStripeSdk.downloadAndShareFile(url, null)
          .then((result) => {
            if (!result.success) {
              console.warn('CSV export share failed:', result.error);
            }
          })
          .catch((error) => {
            handleUnexpectedError(error);
          });
        return false; // Block WebView navigation
      }

      if (navigationType !== 'click') return true;

      // Allow navigation within allowed Stripe domains (matching iOS SDK behavior)
      if (ALLOWED_STRIPE_HOSTS.some((host) => url.includes(host))) {
        return true; // Allow in-WebView navigation
      }

      // Open external links in system browser
      Linking.openURL(url).catch((error) => {
        handleUnexpectedError(error);
      });

      return false; // Block in-WebView navigation for external links
    },
    [handleUnexpectedError]
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
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onLayout={handleLayout}
      // Camera/Media Permissions - matches iOS SDK behavior
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
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

// Detects Stripe CSV export URLs
function isCsvExportUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes('stripe-data-exports') ||
      parsedUrl.pathname.includes('stripe-data-exports')
    );
  } catch {
    return false;
  }
}
