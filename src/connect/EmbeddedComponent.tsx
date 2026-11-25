import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefAttributes,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
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
import type { FinancialConnections, StripeError } from '../types';
import { FinancialConnectionsSheetError } from '../types/FinancialConnections';
import { ComponentAnalyticsClient } from './analytics/ComponentAnalyticsClient';
import {
  buildInjectedObjectScript,
  wrapperDocumentCondition,
} from './injectedObjectScript';
import { createBridgeToken, isRecord, unwrapBridgeMessage } from './bridgeAuth';

// react-native-webview 14 declares WebView<P = undefined>, which collapses
// Component props to never when used as typeof WebView. Type the dynamic
// load against WebViewProps (plus ref) instead.
type WebViewHandle = {
  injectJavaScript: (script: string) => void;
  reload: () => void;
};
type WebViewComponentType = ComponentType<
  WebViewProps & RefAttributes<WebViewHandle>
>;

const DEVELOPMENT_MODE = false;
const DEVELOPMENT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const PRODUCTION_URL = 'https://connect-js.stripe.com';
const BASE_URL = DEVELOPMENT_MODE ? DEVELOPMENT_URL : PRODUCTION_URL;

// RN's global URL is a regex polyfill, so match URLs as strings.
const WRAPPER_PATH = '/v1.0/react_native_webview.html';

const EXTERNAL_LINK_SCHEMES = ['mailto:', 'tel:'];

const sdkVersion = pjson.version;

// Android deep link polling configuration
// These constants control the polling mechanism that prevents Expo Router from dismissing screens
const POLLING_INTERVAL_MS = 500; // How often to check for pending deep links
const URL_DEDUPLICATION_TIMEOUT_MS = 1000; // How long to remember handled URLs
const DEEP_LINK_GRACE_PERIOD_MS = 500; // Time to wait for deep link after app resumes

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
const PRODUCTION_STRIPE_HOSTS = [
  'connect-js.stripe.com',
  'connect.stripe.com',
  'verify.stripe.com',
];
const DEVELOPMENT_STRIPE_HOSTS = DEVELOPMENT_MODE
  ? ['10.0.2.2:3001', 'localhost:3001']
  : [];
const ALLOWED_STRIPE_HOSTS = [
  ...PRODUCTION_STRIPE_HOSTS,
  ...DEVELOPMENT_STRIPE_HOSTS,
];

export interface CommonComponentProps {
  onLoaderStart?: ({ elementTagName }: LoaderStart) => void;
  onLoadError?: ({ error, elementTagName }: LoadError) => void;

  onPageDidLoad?: () => void;

  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  loadingIndicatorContainer: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
});

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

type EmbeddedFinancialConnectionsResult =
  | {
      session: FinancialConnections.Session;
      token: ReturnType<typeof toStripeJsBankAccountToken> | null;
      error?: undefined;
    }
  | {
      session?: undefined;
      token?: undefined;
      error: StripeError<string>;
    }
  | {
      session?: undefined;
      token?: undefined;
      error?: undefined;
    };

export function EmbeddedComponent(props: EmbeddedComponentProps) {
  const [dynamicWebview, setDynamicWebview] = useState<{
    WebView: WebViewComponentType | null;
    version?: string;
  } | null>(null);

  // Store pending authenticated webview promises (for Android Custom Tabs)
  // Uses a Map keyed by auth session ID to support multiple auth flows.
  // Currently processes promises in FIFO order (first entry resolved first).
  const pendingAuthWebViewPromises = useRef<
    Map<
      string,
      {
        documentId: string;
        callback: (id: string, url: string | null, documentId: string) => void;
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
      // Imported like the module, so it resolves whenever the module does.
      const version = await import('react-native-webview/package.json').then(
        (pkg) => pkg.version,
        () => undefined
      );
      setDynamicWebview({ WebView: mod.WebView, version });
    } catch (err) {
      console.error('Failed to import react-native-webview:', err);
    }
  }, [dynamicWebview]);

  useEffect(() => {
    loadWebViewComponent();
  }, [loadWebViewComponent]);

  const appState = useRef<string | null | undefined>(AppState.currentState);

  // Android deep link polling mechanism (Android-only)
  //
  // PROBLEM: On Android, completing auth in Custom Tabs causes a stripe-connect:// deep link
  // that gets broadcast to React Native's Linking module, which triggers Expo Router and
  // dismisses the current screen.
  //
  // SOLUTION: This polling mechanism intercepts the deep link before Expo Router receives it:
  // 1. MainActivity.onNewIntent() captures stripe-connect:// URLs and stores them
  // 2. This effect polls for pending URLs while auth is active
  // 3. URLs are processed directly and never broadcast to Expo Router
  // 4. Deduplication prevents the same URL from being processed twice
  //
  // This preserves the navigation stack and prevents unwanted screen dismissals.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const pollInterval = setInterval(async () => {
      if (pendingAuthWebViewPromises.current.size === 0) {
        return;
      }

      try {
        const pendingUrls =
          await NativeStripeSdk.pollAndClearPendingStripeConnectUrls();

        if (pendingUrls && pendingUrls.length > 0) {
          pendingUrls.forEach((url: string) => {
            if (url.startsWith('stripe-connect://')) {
              // Deduplication: Skip if we've handled this exact URL
              if (recentlyHandledUrls.current.has(url)) {
                return;
              }

              // Mark as handled
              recentlyHandledUrls.current.add(url);

              // Clear from the set after deduplication timeout
              setTimeout(() => {
                recentlyHandledUrls.current.delete(url);
              }, URL_DEDUPLICATION_TIMEOUT_MS);

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
                promiseData.callback(id, url, promiseData.documentId);

                // Reset the Android flag
                NativeStripeSdk.authWebViewDeepLinkHandled(id).catch(() => {
                  // Intentionally silent - flag reset is not critical
                });
              }
            }
          });
        }
      } catch {
        // Intentionally silent - polling will retry on next interval
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Handle app state changes to detect when user returns from auth flow
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (pendingAuthWebViewPromises.current.size > 0) {
          // Give the deep link handler time to process the URL
          // If no deep link arrives within the grace period, assume the user cancelled
          pendingAuthWebViewPromises.current.forEach((promiseData, id) => {
            // Only set timeout if one doesn't already exist
            if (!promiseData.timeoutId) {
              const timeoutId = setTimeout(() => {
                const stillPending = pendingAuthWebViewPromises.current.get(id);
                if (stillPending) {
                  pendingAuthWebViewPromises.current.delete(id);
                  stillPending.callback(id, null, stillPending.documentId);
                }
              }, DEEP_LINK_GRACE_PERIOD_MS);

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

  const connectURL = `${BASE_URL}${WRAPPER_PATH}#${hash}`;
  const source = useMemo(() => ({ uri: connectURL }), [connectURL]);

  const ref = useRef<WebViewHandle>(null);
  const [bridgeToken] = useState(createBridgeToken);
  const hasLoggedUnauthorizedMessage = useRef(false);
  const hasTriedSourceReload = useRef(false);

  const [prevAppearance, setPrevAppearance] = useState(appearance);
  const [prevLocale, setPrevLocale] = useState(locale);

  if (prevAppearance !== appearance || prevLocale !== locale) {
    setPrevAppearance(appearance);
    setPrevLocale(locale);

    const patchedAppearance = withDefaultFontFamily(appearance);

    ref.current?.injectJavaScript(
      deliverToWrapper(
        `window.updateConnectInstance(${JSON.stringify({ appearance: patchedAppearance, locale })});`
      )
    );
  }

  const [prevComponentProps, setPrevComponentProps] = useState(componentProps);
  if (prevComponentProps !== componentProps) {
    setPrevComponentProps(componentProps);

    Object.entries(componentProps || {}).forEach(([key, value]) => {
      ref.current?.injectJavaScript(
        deliverToWrapper(
          `window.callSetterWithSerializableValue(${JSON.stringify({
            setter: key,
            value,
          })});`
        )
      );
    });
  }

  const handleUnexpectedError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error: ${errorMessage}`);
  }, []);

  const routeOutside = useCallback(
    (url: string) => {
      // Never open the wrapper URL externally: its fragment carries the
      // session key.
      if (url.includes(WRAPPER_PATH)) {
        return;
      }

      const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(url);
      const protocol = schemeMatch ? `${schemeMatch[1]!.toLowerCase()}:` : '';

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
        return;
      }

      if (protocol === 'https:' || EXTERNAL_LINK_SCHEMES.includes(protocol)) {
        Linking.openURL(url).catch((error) => {
          handleUnexpectedError(error);
        });
      }
    },
    [handleUnexpectedError]
  );

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

  const handleAuthWebViewResult = (
    id: string,
    resultUrl: string | null,
    documentId: string
  ) => {
    ref.current?.injectJavaScript(
      deliverToWrapper(
        `window.returnedFromAuthenticatedWebView(${JSON.stringify({
          id,
          url: resultUrl,
        })});`,
        documentId
      )
    );
  };

  const handleFinancialConnectionsResult = (
    id: string,
    result: EmbeddedFinancialConnectionsResult,
    documentId: string
  ) => {
    let value;
    if (result.error) {
      value = {
        id,
        financialConnectionsSession: null,
        token: null,
        error: result.error,
      };
    } else if (result.session) {
      value = {
        id,
        financialConnectionsSession: {
          accounts: result.session.accounts,
        },
        token: result.token,
        error: null,
      };
    } else {
      value = {
        id,
        financialConnectionsSession: null,
        token: null,
        error: null,
      };
    }

    ref.current?.injectJavaScript(
      deliverToWrapper(
        `window.callSetterWithSerializableValue(${JSON.stringify({
          setter: 'setCollectMobileFinancialConnectionsResult',
          value,
        })});`,
        documentId
      )
    );
  };

  const onMessageCallback = useCallback(
    async (event: WebViewMessageEvent) => {
      // Only messages sent through the wrapper document's bridge are enveloped.
      const unwrapped = unwrapBridgeMessage(
        event?.nativeEvent?.data,
        bridgeToken
      );
      if (unwrapped === null) {
        if (!hasLoggedUnauthorizedMessage.current) {
          hasLoggedUnauthorizedMessage.current = true;
          componentAnalytics.logUnauthorizedMessage();
        }
        return;
      }

      const { documentId } = unwrapped;
      let message: { type: string; data?: unknown };
      try {
        const parsed: unknown = JSON.parse(unwrapped.message);
        if (!isRecord(parsed)) return;
        message = parsed as { type: string; data?: unknown };
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

        ref.current?.injectJavaScript(
          deliverToWrapper(
            `window.clientSecretDeferred.resolve(${JSON.stringify(clientSecret)});`,
            documentId
          )
        );
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
        if (!isRecord(message.data)) return;
        const { clientSecret, id, connectedAccountId } = message.data;
        if (typeof id !== 'string') return;

        // Validate client secret
        if (!clientSecret || typeof clientSecret !== 'string') {
          handleFinancialConnectionsResult(
            id,
            {
              error: {
                code: 'InvalidClientSecret',
                message: 'Invalid or missing clientSecret parameter',
              },
            },
            documentId
          );
          return;
        }

        if (
          connectedAccountId != null &&
          typeof connectedAccountId !== 'string'
        ) {
          handleFinancialConnectionsResult(
            id,
            {
              error: {
                code: 'InvalidConnectedAccountId',
                message: 'Invalid connectedAccountId parameter',
              },
            },
            documentId
          );
          return;
        }

        // Prevent multiple simultaneous flows
        if (pendingFinancialConnectionsPromise.current) {
          handleFinancialConnectionsResult(
            id,
            {
              error: {
                code: 'AlreadyInProgress',
                message: 'Financial Connections flow already in progress',
              },
            },
            documentId
          );
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
        let hasCleanedUp = false;
        const cleanup = () => {
          if (hasCleanedUp) return;
          hasCleanedUp = true;
          eventListener?.remove();
          pendingFinancialConnectionsPromise.current = null;
        };

        pendingFinancialConnectionsPromise.current = {
          id,
          cleanup,
        };

        const resultPromise: Promise<FinancialConnections.TokenResult> =
          NativeStripeSdk.collectBankAccountToken(clientSecret, {
            connectedAccountId: connectedAccountId ?? undefined,
          });

        resultPromise
          .then((result) => {
            if (result.error) {
              if (
                result.error.code === FinancialConnectionsSheetError.Canceled
              ) {
                handleFinancialConnectionsResult(id, {}, documentId);
                return;
              }

              handleFinancialConnectionsResult(
                id,
                {
                  error: result.error,
                },
                documentId
              );
              return;
            }

            if (!result.session) {
              handleFinancialConnectionsResult(
                id,
                {
                  error: {
                    code: 'UnexpectedError',
                    message:
                      'Financial Connections completed without a session',
                  },
                },
                documentId
              );
              return;
            }

            handleFinancialConnectionsResult(
              id,
              {
                session: result.session,
                token: result.token
                  ? toStripeJsBankAccountToken(result.token)
                  : null,
              },
              documentId
            );
          })
          .catch((unexpectedError) => {
            handleUnexpectedError(unexpectedError);
            handleFinancialConnectionsResult(
              id,
              {
                error: {
                  code: 'UnexpectedError',
                  message:
                    unexpectedError instanceof Error
                      ? unexpectedError.message
                      : 'An unexpected error occurred during Financial Connections',
                },
              },
              documentId
            );
          })
          .finally(cleanup);
      } else if (message.type === 'closeWebView') {
        // message.data is empty
        callbacks?.onCloseWebView?.({});
      } else if (message.type === 'callSupplementalFunction') {
        // message.data is of type {[key]: {functionName: string; args: unknown[]; invocationId: string;}}
      } else if (message.type === 'onSetterFunctionCalled') {
        if (!isRecord(message.data)) return;
        const { setter, value } = message.data;

        if (setter === 'setOnLoaderStart') {
          onLoaderStart?.(value as LoaderStart);
        } else if (setter === 'setOnLoadError') {
          onLoadError?.(value as LoadError);
        } else {
          // remove the 'set' prefix and lowercase the first letter
          const functionName =
            typeof setter === 'string' && setter.startsWith('set')
              ? setter.charAt(3).toLowerCase() + setter.substring(4)
              : undefined;
          // Own properties only: 'constructor' and '__proto__' must not resolve.
          const callback =
            callbacks &&
            functionName !== undefined &&
            Object.prototype.hasOwnProperty.call(callbacks, functionName)
              ? callbacks[functionName]
              : undefined;
          if (typeof callback === 'function') {
            callback(value);
          } else {
            componentAnalytics.logUnrecognizedSetter(
              typeof setter === 'string' ? setter : 'unknown'
            );
          }
        }
      } else if (message.type === 'openAuthenticatedWebView') {
        if (!isRecord(message.data)) return;
        const { url, id } = message.data;
        if (typeof url !== 'string' || typeof id !== 'string') return;

        // Validate URL before opening. Never log `url` itself.
        if (!isValidUrl(url)) {
          handleUnexpectedError(
            new Error('Invalid URL for authenticated webview')
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
              handleAuthWebViewResult(id, resultUrl, documentId);
            } else {
              // Android: Store promise in Map to be resolved by deep link listener
              pendingAuthWebViewPromises.current.set(id, {
                documentId,
                callback: (
                  authId: string,
                  resultUrl: string | null,
                  replyDocumentId: string
                ) => {
                  if (resultUrl) {
                    componentAnalytics.logAuthenticatedWebViewRedirected(
                      authId
                    );
                  } else {
                    componentAnalytics.logAuthenticatedWebViewCanceled(authId);
                  }
                  handleAuthWebViewResult(authId, resultUrl, replyDocumentId);
                },
              });
            }
          })
          .catch((error) => {
            if (__DEV__) {
              console.error(
                `[EmbeddedComponent] Error opening authenticated webview:`,
                error
              );
            }
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
      bridgeToken,
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
      const { url, navigationType, isTopFrame, mainDocumentURL } = event;

      if (isCsvExportUrl(url)) {
        routeOutside(url);
        return false;
      }

      if (Platform.OS === 'ios') {
        // iOS derives isTopFrame from mainDocumentURL; treat a missing one
        // as the top frame.
        const isMainFrame = isTopFrame === true || !mainDocumentURL;

        if (isMainFrame) {
          if (isTrustedWrapperDocument(url, connectURL)) {
            return true;
          }
          routeOutside(url);
          return false;
        }

        if (navigationType !== 'click') {
          return (
            url.startsWith('https:') ||
            url.startsWith('about:') ||
            url.startsWith('blob:') ||
            url.startsWith('data:')
          );
        }

        if (isAllowedStripeHost(url)) {
          return true;
        }
        routeOutside(url);
        return false;
      }

      // Android reports every navigation as a top-frame 'other'; the wrapper page
      // loads only at its configured URL.
      if (isTrustedWrapperDocument(url, connectURL)) {
        return true;
      }
      if (isWrapperPageUrl(url)) {
        return false;
      }
      if (isAllowedStripeHost(url)) {
        return true;
      }
      routeOutside(url);
      return false;
    },
    [connectURL, routeOutside]
  );

  const onOpenWindow = useCallback(
    (event: WebViewOpenWindowEvent) => {
      routeOutside(event.nativeEvent.targetUrl);
    },
    [routeOutside]
  );

  const backgroundColor = appearance?.variables?.colorBackground || '#FFFFFF';
  const textColor = appearance?.variables?.colorText || '#000000';

  const mergedStyle = useMemo(
    () => [{ backgroundColor }, style],
    [backgroundColor, style]
  );

  const injectedObject = useMemo(
    () => ({
      initParams: {
        appearance: withDefaultFontFamily(appearance),
        locale,
        fonts,
      },
      initComponentProps: componentProps,
      appInfo: { applicationId: overrides?.applicationId },
    }),
    [appearance, locale, fonts, componentProps, overrides?.applicationId]
  );

  const injectedObjectScript = useMemo(
    () =>
      buildInjectedObjectScript(injectedObject, {
        token: bridgeToken,
        origin: BASE_URL,
        path: WRAPPER_PATH,
        url: connectURL,
      }),
    [injectedObject, bridgeToken, connectURL]
  );

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      ref={ref}
      style={mergedStyle}
      renderLoading={() => {
        return (
          <View style={[styles.loadingIndicatorContainer, { backgroundColor }]}>
            <ActivityIndicator color={textColor} />
          </View>
        );
      }}
      webviewDebuggingEnabled={DEVELOPMENT_MODE}
      source={source}
      userAgent={userAgent}
      // injectedObjectScript defines injectedObjectJson() read-only. The prop
      // is only passed where react-native-webview needs it and serves it safely.
      injectedJavaScriptObject={
        shouldPassInjectedJavaScriptObject(dynamicWebview?.version)
          ? injectedObject
          : undefined
      }
      // Fixes injectedJavaScriptObject in Android https://github.com/react-native-webview/react-native-webview/issues/3326#issuecomment-3048111789
      injectedJavaScriptBeforeContentLoaded={injectedObjectScript}
      onMessage={onMessageCallback}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onOpenWindow={onOpenWindow}
      // The default whitelist would auto-open non-http(s) URLs via Linking
      // before our callbacks run.
      originWhitelist={['*']}
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

// react-native-webview's injectedJavaScriptObject embeds the JSON in a JS
// template literal on iOS and on Android from 13.13.1, so a backtick or `${` in
// any value runs as script in the Connect page. injectedObjectScript serves the
// same object safely there. On Android before 13.13.1 the prop is served from a
// Java method, which is safe, and the page doesn't see injectedObjectScript's
// definition, so the prop is still needed. An unknown version keeps the prop.
// https://github.com/react-native-webview/react-native-webview/issues/3957
// https://github.com/react-native-webview/react-native-webview/issues/3942
// TODO: Remove injectedJavaScriptObject and this check once the minimum
// supported react-native-webview version is 13.13.1 or later.
function shouldPassInjectedJavaScriptObject(
  webViewVersion: string | undefined
): boolean {
  if (Platform.OS !== 'android') return false;

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(webViewVersion ?? '');
  if (!match) return true;

  const [major, minor, patch] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  if (major !== 13) return major < 13;
  if (minor !== 13) return minor < 13;
  return patch < 1;
}

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

// connect-js expects the Stripe.js API-shaped (snake_case) token, matching what the
// native iOS/Android Connect SDKs send. RN's FinancialConnections token is camelCase.
/** @internal Exported for testing only. */
export function toStripeJsBankAccountToken(
  token: FinancialConnections.BankAccountToken
) {
  const ba = token.bankAccount;
  return {
    id: token.id,
    object: 'token' as const,
    type: 'bank_account' as const,
    used: token.used,
    livemode: token.livemode,
    created: token.created,
    bank_account: ba
      ? {
          id: ba.id,
          object: 'bank_account' as const,
          account_holder_name: ba.accountHolderName,
          account_holder_type: ba.accountHolderType,
          bank_name: ba.bankName,
          country: ba.country,
          currency: ba.currency,
          fingerprint: ba.fingerprint,
          last4: ba.last4,
          routing_number: ba.routingNumber,
          status: ba.status,
        }
      : null,
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

// Matches url's authority (host[:port]) against hosts, requiring scheme.
function hasAllowedStripeAuthority(
  url: string,
  hosts: readonly string[],
  scheme: 'https' | 'https?'
): boolean {
  const match = new RegExp(`^${scheme}:\\/\\/([^/?#]*)`, 'i').exec(url);
  if (!match) return false;
  const authority = match[1]!.toLowerCase();
  const authorityWithoutPort = authority.replace(/:\d*$/, '');
  return hosts.some(
    (host) => authority === host || authorityWithoutPort === host
  );
}

export function isAllowedStripeHost(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const allowedByRuntimeParser = ALLOWED_STRIPE_HOSTS.some(
      (host) => parsedUrl.hostname === host || parsedUrl.host === host
    );
    if (!allowedByRuntimeParser) return false;

    return (
      hasAllowedStripeAuthority(url, PRODUCTION_STRIPE_HOSTS, 'https') ||
      hasAllowedStripeAuthority(url, DEVELOPMENT_STRIPE_HOSTS, 'https?')
    );
  } catch {
    return false;
  }
}

// Detects Stripe CSV export URLs via an anchored regex on exact export
// hosts; a path merely containing "stripe-data-exports" proves nothing.
const CSV_EXPORT_HOST_PATTERN =
  /^https:\/\/(?:stripe-data-exports\.com|(?:[a-z0-9-]+\.)+stripe-data-exports\.com|stripe-data-exports\.s3\.amazonaws\.com)(?::\d+)?(?:[/?#]|$)/i;

function isCsvExportUrl(url: string): boolean {
  return CSV_EXPORT_HOST_PATTERN.test(url);
}

// Runs the payload only in a document on the wrapper origin and path.
// Replies run only in the document that sent the request.
function deliverToWrapper(payloadScript: string, documentId?: string): string {
  const documentCheck =
    documentId === undefined
      ? ''
      : ` && window.ReactNativeWebView && window.ReactNativeWebView.documentId === ${JSON.stringify(documentId)}`;
  return `
    (function() {
      if (${wrapperDocumentCondition(BASE_URL, WRAPPER_PATH)}${documentCheck}) {
        ${payloadScript}
      }
      true;
    })();
  `;
}

function isTrustedWrapperDocument(url: string, connectURL: string): boolean {
  return url === connectURL;
}

// True for any URL on the wrapper page, whatever its query or fragment.
function isWrapperPageUrl(url: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(url);
  if (!match) return false;
  const scheme = match[1]!.toLowerCase();
  const authority = match[2]!
    .toLowerCase()
    .replace(scheme === 'https' ? /:443$/ : /:80$/, '');
  return (
    `${scheme}://${authority}` === BASE_URL &&
    match[3]!.toLowerCase() === WRAPPER_PATH.toLowerCase()
  );
}
