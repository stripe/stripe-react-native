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
  AppStateStatus,
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
  WebViewNavigationEvent,
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
import { buildInjectedObjectScript } from './injectedObjectScript';

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

// The wrapper document is the only page the SDK trusts to receive secrets
// (fetchClientSecret replies, Financial Connections results, auth redirect
// URLs...). Its origin is BASE_URL itself (not hardcoded separately, so
// DEVELOPMENT_MODE pins the dev origin automatically). We deliberately never
// build a URL object out of these: React Native's global `URL` is the
// regex-based polyfill in react-native/Libraries/Blob/URL.js, not a WHATWG
// parser, and it disagrees with real browsers on pathname/hostname for many
// inputs. All wrapper-identity checks below are plain string operations.
const WRAPPER_PATH = '/v1.0/react_native_webview.html';

// Explicit allowlist of non-http(s) schemes that are safe to hand to the OS
// via Linking. Anything not https: or in this list is dropped silently by
// routeOutside -- in particular custom app schemes, intent:, javascript: and
// plain http:.
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

// Allowed domains for in-WebView navigation (matching iOS SDK behavior).
// Production Stripe hosts are https-only. DEVELOPMENT_MODE dev hosts may
// still use http, since the local dev server doesn't have TLS.
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
        callback: (id: string, url: string | null) => void;
        timeoutId?: NodeJS.Timeout;
        // The document generation when this auth flow was requested (D3
        // hygiene). Checked before `callback` runs, since the deep link /
        // app-state timeout that invokes it can fire well after a newer
        // top-frame load has started.
        requestGeneration: number;
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

  const appState = useRef<AppStateStatus>(AppState.currentState);

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
                // Hygiene (D3): drop the reply if a new top-frame load
                // started while this deep link was in flight.
                if (
                  documentGeneration.current === promiseData.requestGeneration
                ) {
                  promiseData.callback(id, url);
                }

                // Reset the Android flag
                NativeStripeSdk.authWebViewDeepLinkHandled(id).catch(() => {
                  // Intentionally silent - flag reset is not critical
                });
              }
            }
          });
        }
      } catch (_error) {
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
        appState.current.match(/inactive|background/) &&
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
                  // Hygiene (D3): drop the cancellation reply if a new
                  // top-frame load started while this auth flow was pending.
                  if (
                    documentGeneration.current ===
                    stillPending.requestGeneration
                  ) {
                    stillPending.callback(id, null);
                  }
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
  const hasTriedSourceReload = useRef(false);

  // D3 hygiene, NOT the security boundary (that's deliverToWrapper's
  // origin/path guard, which runs inside the document itself). Bumping this
  // on every new top-frame document load lets async completions drop a
  // reply whose request predates a newer load, instead of injecting it into
  // a document that never asked for it.
  const documentGeneration = useRef(0);
  const lastLoadStartUrl = useRef<string | null>(null);

  const onLoadStart = useCallback((event: WebViewNavigationEvent) => {
    const { url, navigationType } = event.nativeEvent;
    const previousUrl = lastLoadStartUrl.current;
    lastLoadStartUrl.current = url;

    // A pure fragment change within the same document (e.g. client-side
    // routing) isn't a new document load, so it shouldn't invalidate
    // in-flight requests. A same-URL reload -- including the forced iOS
    // reload below -- is still treated as a new load. This only applies on
    // iOS: Android's onLoadStart carries no real navigationType (it's
    // always 'other') and isn't emitted at all for a same-document fragment
    // change, so every Android event here is already a new load.
    if (
      Platform.OS === 'ios' &&
      previousUrl !== null &&
      navigationType !== 'reload' &&
      isSameDocumentExceptFragment(previousUrl, url)
    ) {
      return;
    }

    documentGeneration.current += 1;
  }, []);

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

  // Shared by onShouldStartLoadWithRequest and onOpenWindow (D4): a popup or
  // a navigation that doesn't stay in-WebView is routed to the OS by scheme,
  // never loaded into the bridged WebView.
  const routeOutside = useCallback(
    (url: string) => {
      // Never hand a URL carrying the wrapper's path to the OS, even if it
      // failed the exact match elsewhere (e.g. a stale hash after a config
      // change, a different scheme/port, or a URL that normalizes
      // differently): its fragment carries apiKeyOverride, a live session
      // key. A substring check, not a prefix one, so a lookalike scheme or
      // host doesn't slip through. Drop it silently; never log it.
      if (url.includes(WRAPPER_PATH)) {
        return;
      }

      // Scheme via regex, not `new URL(url).protocol`: see the module-level
      // comment above. The constructor also throws for some valid
      // non-http(s) URLs (e.g. `mailto:x#y`) under the RN polyfill.
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

      // https: and the explicit mailto:/tel: allowlist are handed to the OS.
      // Everything else (http:, javascript:, data:, custom app schemes,
      // intent:, ...) is dropped silently: we never auto-launch an arbitrary
      // scheme handler for content we don't trust.
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

  const handleAuthWebViewResult = (id: string, resultUrl: string | null) => {
    ref.current?.injectJavaScript(
      deliverToWrapper(
        `window.returnedFromAuthenticatedWebView(${JSON.stringify({
          id,
          url: resultUrl,
        })});`
      )
    );
  };

  const handleFinancialConnectionsResult = (
    id: string,
    result: EmbeddedFinancialConnectionsResult
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
        })});`
      )
    );
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
        const requestGeneration = documentGeneration.current;
        const clientSecret = await fetchClientSecret().catch((error) => {
          handleUnexpectedError(error);
          return null;
        });
        if (!clientSecret) return;
        // Hygiene (D3): a new top-frame load started while fetchClientSecret
        // was pending, so the document that asked for this secret may no
        // longer be running. Each wrapper document requests its own secret
        // during init, so dropping a stale first-load reply is safe.
        if (documentGeneration.current !== requestGeneration) return;

        ref.current?.injectJavaScript(
          deliverToWrapper(
            `window.clientSecretDeferred.resolve(${JSON.stringify(clientSecret)});`
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

        const requestGeneration = documentGeneration.current;
        const resultPromise: Promise<FinancialConnections.TokenResult> =
          NativeStripeSdk.collectBankAccountToken(clientSecret, {
            connectedAccountId,
          });

        resultPromise
          .then((result) => {
            // Hygiene (D3): drop the reply if a new top-frame load started
            // while Financial Connections was running.
            if (documentGeneration.current !== requestGeneration) return;

            if (result.error) {
              if (
                result.error.code === FinancialConnectionsSheetError.Canceled
              ) {
                handleFinancialConnectionsResult(id, {});
                return;
              }

              handleFinancialConnectionsResult(id, {
                error: result.error,
              });
              return;
            }

            if (!result.session) {
              handleFinancialConnectionsResult(id, {
                error: {
                  code: 'UnexpectedError',
                  message: 'Financial Connections completed without a session',
                },
              });
              return;
            }

            handleFinancialConnectionsResult(id, {
              session: result.session,
              token: result.token
                ? toStripeJsBankAccountToken(result.token)
                : null,
            });
          })
          .catch((unexpectedError) => {
            handleUnexpectedError(unexpectedError);
            if (documentGeneration.current !== requestGeneration) return;
            handleFinancialConnectionsResult(id, {
              error: {
                code: 'UnexpectedError',
                message:
                  unexpectedError instanceof Error
                    ? unexpectedError.message
                    : 'An unexpected error occurred during Financial Connections',
              },
            });
          })
          .finally(cleanup);
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
        const requestGeneration = documentGeneration.current;
        NativeStripeSdk.openAuthenticatedWebView(id, url)
          .then((result) => {
            if (Platform.OS === 'ios') {
              // Hygiene (D3): drop the reply if a new top-frame load started
              // while the auth webview was open.
              if (documentGeneration.current !== requestGeneration) return;

              // iOS returns the redirect URL directly
              const resultUrl = result?.url ?? null;
              if (resultUrl) {
                componentAnalytics.logAuthenticatedWebViewRedirected(id);
              } else {
                componentAnalytics.logAuthenticatedWebViewCanceled(id);
              }
              handleAuthWebViewResult(id, resultUrl);
            } else {
              // Android: Store promise in Map to be resolved by deep link
              // listener. requestGeneration travels with it so the deep
              // link / app-state callback below can apply the same hygiene
              // check once it actually fires.
              pendingAuthWebViewPromises.current.set(id, {
                requestGeneration,
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

      // CSV exports are handled first, before any frame/host classification:
      // a Payouts CSV download navigates straight to a presigned, one-time
      // export URL that isn't part of any document we'd otherwise trust.
      if (isCsvExportUrl(url)) {
        routeOutside(url);
        return false;
      }

      if (Platform.OS === 'ios') {
        // iOS computes isTopFrame by comparing the request URL to
        // mainDocumentURL. Treat a missing mainDocumentURL as top-frame too
        // (fail closed, D5): we'd rather apply the stricter main-frame policy
        // to a navigation we can't classify than let it slip through as a
        // harmless subframe load.
        const isMainFrame = isTopFrame === true || !mainDocumentURL;

        if (isMainFrame) {
          // The only privileged top document is the exact Connect wrapper
          // (D1): no legitimate flow ever navigates the top frame away from
          // it (auth and Financial Connections are native; verify.stripe.com
          // is only ever an iframe). So any other top-frame navigation, of
          // ANY navigationType -- including a reload, backforward, or
          // form(re)submit to a different URL -- is routed outside and never
          // loaded in place.
          if (isTrustedWrapperDocument(url, connectURL)) {
            return true;
          }
          routeOutside(url);
          return false;
        }

        // Subframe navigation (e.g. the verify.stripe.com iframe, or a
        // benign resource load). A non-click load of a scheme that can't
        // itself trigger further navigation is allowed to render in place.
        if (navigationType !== 'click') {
          return (
            url.startsWith('https:') ||
            url.startsWith('about:') ||
            url.startsWith('blob:') ||
            url.startsWith('data:')
          );
        }

        // A user click in a subframe may only land on an allowed Stripe
        // host; anything else is routed outside.
        if (isAllowedStripeHost(url)) {
          return true;
        }
        routeOutside(url);
        return false;
      }

      // Android (D2): react-native-webview hardcodes isTopFrame: true and
      // navigationType: 'other' for every navigation, so main-frame vs.
      // subframe and click vs. programmatic navigations can't be told apart.
      // The only policy that's safe for all of them is: keep in-WebView
      // navigation to the trusted wrapper or an https allowed Stripe host,
      // and route everything else outside. Documented residual risk (D2):
      // an allowlisted Stripe host replacing the main frame on Android can't
      // be distinguished from a benign subframe/resource load.
      if (
        isTrustedWrapperDocument(url, connectURL) ||
        isAllowedStripeHost(url)
      ) {
        return true;
      }
      routeOutside(url);
      return false;
    },
    [connectURL, routeOutside]
  );

  // Always registered, on both platforms (D4): a popup must never load into
  // the bridged WebView. Registering onOpenWindow makes react-native-webview
  // report it here instead of silently falling back to loading the popup's
  // request into the existing WebView (iOS) or dropping it (Android).
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
    () => buildInjectedObjectScript(injectedObject),
    [injectedObject]
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
      onLoadStart={onLoadStart}
      onMessage={onMessageCallback}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onOpenWindow={onOpenWindow}
      // react-native-webview checks originWhitelist (default http(s) only)
      // before calling onShouldStartLoadWithRequest, and auto-opens anything
      // that fails it via Linking (WebViewShared.tsx). That would run before
      // our own scheme policy and bypass routeOutside's CSV/mailto/tel
      // handling, so widen it to '*' and let onShouldStartLoadWithRequest and
      // onOpenWindow make every decision instead. This isn't a loosening:
      // those two callbacks are the actual gate, and they're stricter than
      // the default whitelist, not looser.
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

// Matches `url`'s authority (host[:port]) against `hosts`, requiring
// `scheme`. The authority is read from the raw string, so the decision
// doesn't depend on the runtime's URL class (React Native's can misread "@"
// in a query or fragment).
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

    // Production hosts are https-only. DEVELOPMENT_MODE dev hosts may be
    // http or https.
    return (
      hasAllowedStripeAuthority(url, PRODUCTION_STRIPE_HOSTS, 'https') ||
      hasAllowedStripeAuthority(url, DEVELOPMENT_STRIPE_HOSTS, 'https?')
    );
  } catch {
    return false;
  }
}

// Detects Stripe CSV export URLs. Only exact export hosts count: a path that
// merely contains "stripe-data-exports" is not evidence of anything, since
// any host can serve a path with that substring. An anchored regex on the
// raw string, like isAllowedStripeHost's pattern -- not URL parsing (see the
// module-level comment above): React Native's URL polyfill mishandles
// "@" userinfo, so e.g. `https://evil.example/@stripe-data-exports.s3.amazonaws.com/x.csv`
// would otherwise report the trusted host.
const CSV_EXPORT_HOST_PATTERN =
  /^https:\/\/(?:stripe-data-exports\.com|(?:[a-z0-9-]+\.)+stripe-data-exports\.com|stripe-data-exports\.s3\.amazonaws\.com)(?::\d+)?(?:[/?#]|$)/i;

function isCsvExportUrl(url: string): boolean {
  return CSV_EXPORT_HOST_PATTERN.test(url);
}

// Wraps `payloadScript` so it only runs inside the trusted wrapper document
// (D3, the security boundary). Page script can't override `window.location`
// or its `origin`/`pathname` getters, and this check runs atomically inside
// whichever document actually receives and executes the script -- closing
// the race between an RN-side check and native script execution. A
// generation counter (kept separately) is hygiene on top of this, not a
// substitute for it: it can only drop a reply before it's sent, while this
// guard is what actually decides whether the reply takes effect once
// delivered. This runs inside the WebView's own JS engine, not RN's, so it
// isn't affected by the RN `URL` polyfill issues noted above.
function deliverToWrapper(payloadScript: string): string {
  return `
    (function() {
      if (
        window.location.origin === ${JSON.stringify(BASE_URL)} &&
        window.location.pathname === ${JSON.stringify(WRAPPER_PATH)}
      ) {
        ${payloadScript}
      }
      true;
    })();
  `;
}

// Is `nextUrl` the same document as `prevUrl`, differing only in the
// fragment (e.g. client-side routing within the wrapper)? Used by the
// generation counter to tell a pure fragment change apart from a real
// document load. A plain string comparison, not URL parsing -- see the
// module-level comment above.
function isSameDocumentExceptFragment(
  prevUrl: string,
  nextUrl: string
): boolean {
  return prevUrl.split('#')[0] === nextUrl.split('#')[0];
}

// Is `url` the exact wrapper document the SDK trusts with the secret-key
// fragment? `connectURL` is built from BASE_URL, WRAPPER_PATH and the
// current hash, so an exact string match also implies scheme, host, port,
// path and fragment all match exactly -- not merely a prefix. Never log
// `url`: the fragment carries apiKeyOverride, a live session key.
function isTrustedWrapperDocument(url: string, connectURL: string): boolean {
  return url === connectURL;
}
