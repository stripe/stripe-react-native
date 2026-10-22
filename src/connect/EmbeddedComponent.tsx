import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import type {
  ShouldStartLoadRequest,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
import type { WebView } from 'react-native-webview';
import type { EventSubscription } from 'react-native';
import pjson from '../../package.json';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import NativeConnectBridgeContainer, {
  Commands as ConnectBridgeCommands,
  type ConnectBridgeClaimResultEvent,
  type ConnectBridgeErrorEvent,
  type ConnectBridgeRequestEvent,
} from '../specs/NativeConnectBridgeContainer';
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

const DEVELOPMENT_MODE = false;
const DEVELOPMENT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const PRODUCTION_URL = 'https://connect-js.stripe.com';
const BASE_URL = DEVELOPMENT_MODE ? DEVELOPMENT_URL : PRODUCTION_URL;

const sdkVersion = pjson.version;

const connectContextIds = new WeakMap<object, string>();
let nextConnectContextId = 1;
let activeAndroidAuthOwner: { operationId: string; token: object } | null =
  null;
let nextConnectSourceGeneration = 1;

function releaseAndroidAuthOwner(token: object, operationId: string) {
  if (
    activeAndroidAuthOwner?.token === token &&
    activeAndroidAuthOwner.operationId === operationId
  ) {
    activeAndroidAuthOwner = null;
  }
}

function reserveAndroidAuthOwner(token: object, operationId: string): boolean {
  if (activeAndroidAuthOwner) return false;
  activeAndroidAuthOwner = { token, operationId };
  return true;
}

function getNativeAuthOperationId(replyContext: ConnectBridgeReplyContext) {
  return JSON.stringify([
    replyContext.attachmentId,
    replyContext.requestHandle,
  ]);
}

function getConnectContextId(connectInstance: object): string {
  let contextId = connectContextIds.get(connectInstance);
  if (!contextId) {
    contextId = `connect-context-${nextConnectContextId++}`;
    connectContextIds.set(connectInstance, contextId);
  }
  return contextId;
}

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

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
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
  sizeToContent?: boolean;
  onContentHeightChange?: (height: number) => void;
  onOpenNotificationBannerForm?: (form: Record<string, unknown>) => void;
  presentExternalLinksInApp?: boolean;
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

type ConnectBridgeReplyContext = {
  attachmentId: string;
  requestHandle: string;
  documentId: string;
  contextId: string;
  sourceGeneration: string;
  claimToken?: string;
};

type ConnectBridgeClaimWaiter = {
  attachmentId: string;
  requestHandle: string;
  contextId: string;
  sourceGeneration: string;
  resolve: (result: { admitted: boolean; claimToken?: string }) => void;
};

type ConnectBridgeReplyAction =
  | 'clientSecret'
  | 'financialConnections'
  | 'authenticatedWebView';

export function EmbeddedComponent(props: EmbeddedComponentProps) {
  const [dynamicWebview, setDynamicWebview] = useState<{
    WebView: typeof WebView | null;
  } | null>(null);

  // Store pending authenticated webview promises (for Android Custom Tabs)
  // Uses a Map keyed by auth session ID to support multiple auth flows.
  // Currently processes promises in FIFO order (first entry resolved first).
  const pendingAuthWebViewPromises = useRef<
    Map<
      string,
      {
        id: string;
        callback: (id: string, url: string | null) => void;
        timeoutId?: NodeJS.Timeout;
      }
    >
  >(new Map());

  // Store pending Financial Connections promise
  const pendingFinancialConnectionsPromise = useRef<{
    id: string;
    cleanup: () => void;
    replyContext: ConnectBridgeReplyContext;
  } | null>(null);
  const androidAuthOwnerToken = useRef<object>({});
  const isComponentMounted = useRef(true);
  const pendingBridgeClaimWaiters = useRef(
    new Map<string, ConnectBridgeClaimWaiter>()
  );
  const nextBridgeClaimId = useRef(1);

  const clearPendingAndroidAuthRequests = useCallback(() => {
    const owner = activeAndroidAuthOwner;
    if (owner?.token === androidAuthOwnerToken.current) {
      releaseAndroidAuthOwner(owner.token, owner.operationId);
      NativeStripeSdk.authWebViewDeepLinkHandled(owner.operationId).catch(
        () => {}
      );
    }
    pendingAuthWebViewPromises.current.forEach((promiseData) => {
      if (promiseData.timeoutId) clearTimeout(promiseData.timeoutId);
    });
    pendingAuthWebViewPromises.current.clear();
  }, []);

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
    isComponentMounted.current = true;
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
                const [operationId, promiseData] = firstEntry;
                const owner = activeAndroidAuthOwner;
                if (
                  owner?.token !== androidAuthOwnerToken.current ||
                  owner.operationId !== operationId
                ) {
                  pendingAuthWebViewPromises.current.delete(operationId);
                  return;
                }

                // Clear the timeout if it exists
                if (promiseData.timeoutId) {
                  clearTimeout(promiseData.timeoutId);
                }

                // Remove from Map and invoke callback
                pendingAuthWebViewPromises.current.delete(operationId);
                releaseAndroidAuthOwner(owner.token, operationId);
                promiseData.callback(promiseData.id, url);

                // Reset the Android flag
                NativeStripeSdk.authWebViewDeepLinkHandled(operationId).catch(
                  () => {
                    // Intentionally silent - flag reset is not critical
                  }
                );
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
          pendingAuthWebViewPromises.current.forEach(
            (promiseData, operationId) => {
              // Only set timeout if one doesn't already exist
              if (!promiseData.timeoutId) {
                const timeoutId = setTimeout(() => {
                  const stillPending =
                    pendingAuthWebViewPromises.current.get(operationId);
                  if (stillPending) {
                    pendingAuthWebViewPromises.current.delete(operationId);
                    releaseAndroidAuthOwner(
                      androidAuthOwnerToken.current,
                      operationId
                    );
                    stillPending.callback(stillPending.id, null);
                    NativeStripeSdk.authWebViewDeepLinkHandled(
                      operationId
                    ).catch(() => {});
                  }
                }, DEEP_LINK_GRACE_PERIOD_MS);

                // Store the timeout ID so we can clear it later if needed
                promiseData.timeoutId = timeoutId;
              }
            }
          );
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      isComponentMounted.current = false;
      clearPendingAndroidAuthRequests();
      // Clear all pending timeouts and promises
      // We intentionally want the latest ref value at cleanup time

      pendingFinancialConnectionsPromise.current?.cleanup();
      subscription.remove();
    };
  }, [clearPendingAndroidAuthRequests]);

  const { connectInstance, appearance, locale, analyticsClient } =
    useConnectComponents();
  const connectContextId = getConnectContextId(connectInstance);
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
    sizeToContent,
    onContentHeightChange,
    onOpenNotificationBannerForm,
    presentExternalLinksInApp,
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
  const sourceAuthority = JSON.stringify([
    connectContextId,
    component,
    connectURL,
  ]);
  const sourceGenerationState = useRef({
    authority: sourceAuthority,
    value: `connect-source-${nextConnectSourceGeneration++}`,
  });
  if (sourceGenerationState.current.authority !== sourceAuthority) {
    sourceGenerationState.current = {
      authority: sourceAuthority,
      value: `connect-source-${nextConnectSourceGeneration++}`,
    };
  }
  const sourceGeneration = sourceGenerationState.current.value;
  const latestBridgeOwner = useRef({ connectContextId, sourceGeneration });
  latestBridgeOwner.current = { connectContextId, sourceGeneration };
  const previousBridgeOwner = useRef({ connectContextId, sourceGeneration });

  useLayoutEffect(() => {
    if (
      previousBridgeOwner.current.connectContextId === connectContextId &&
      previousBridgeOwner.current.sourceGeneration === sourceGeneration
    ) {
      return;
    }
    previousBridgeOwner.current = { connectContextId, sourceGeneration };
    clearPendingAndroidAuthRequests();
    pendingFinancialConnectionsPromise.current?.cleanup();
  }, [clearPendingAndroidAuthRequests, connectContextId, sourceGeneration]);

  const connectBridgeRef =
    useRef<React.ElementRef<typeof NativeConnectBridgeContainer>>(null);

  useEffect(() => {
    const bridgeContainer = connectBridgeRef.current;
    const claimWaiters = pendingBridgeClaimWaiters.current;
    return () => {
      claimWaiters.forEach((waiter) => {
        if (bridgeContainer) {
          ConnectBridgeCommands.cancel(
            bridgeContainer,
            waiter.attachmentId,
            waiter.requestHandle
          );
        }
        waiter.resolve({ admitted: false });
      });
      claimWaiters.clear();
    };
  }, [connectContextId, sourceGeneration]);

  const isCurrentBridgeOwner = useCallback(
    (contextId: string, requestSourceGeneration: string) => {
      const currentOwner = latestBridgeOwner.current;
      return (
        isComponentMounted.current &&
        contextId === currentOwner.connectContextId &&
        requestSourceGeneration === currentOwner.sourceGeneration
      );
    },
    []
  );

  const isCurrentBridgeRequest = useCallback(
    (request: ConnectBridgeReplyContext) =>
      isCurrentBridgeOwner(request.contextId, request.sourceGeneration),
    [isCurrentBridgeOwner]
  );

  const cancelConnectBridgeRequest = useCallback(
    (
      request: Pick<ConnectBridgeReplyContext, 'attachmentId' | 'requestHandle'>
    ) => {
      const bridgeContainer = connectBridgeRef.current;
      if (!bridgeContainer) return;
      ConnectBridgeCommands.cancel(
        bridgeContainer,
        request.attachmentId,
        request.requestHandle
      );
    },
    []
  );

  const replyToConnectBridge = useCallback(
    (
      request: ConnectBridgeReplyContext,
      action: ConnectBridgeReplyAction,
      data: unknown
    ) => {
      const bridgeContainer = connectBridgeRef.current;
      if (!bridgeContainer || !isCurrentBridgeRequest(request)) return;

      ConnectBridgeCommands.reply(
        bridgeContainer,
        request.attachmentId,
        request.requestHandle,
        JSON.stringify({ type: 'connectBridgeReply', action, data })
      );
    },
    [isCurrentBridgeRequest]
  );

  const handleUnexpectedError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error: ${errorMessage}`);
  }, []);

  const WebViewComponent = dynamicWebview?.WebView;

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

  const handleAuthWebViewResult = useCallback(
    (
      id: string,
      resultUrl: string | null,
      replyContext: ConnectBridgeReplyContext
    ) => {
      replyToConnectBridge(replyContext, 'authenticatedWebView', {
        id,
        url: resultUrl,
      });
    },
    [replyToConnectBridge]
  );

  const handleFinancialConnectionsResult = useCallback(
    (
      id: string,
      result: EmbeddedFinancialConnectionsResult,
      replyContext: ConnectBridgeReplyContext
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

      replyToConnectBridge(replyContext, 'financialConnections', value);
    },
    [replyToConnectBridge]
  );

  const onMessageCallback = useCallback(
    async (rawMessage: string, replyContext: ConnectBridgeReplyContext) => {
      if (!isCurrentBridgeRequest(replyContext)) return;
      let message: { type: string; data?: unknown };
      try {
        message = JSON.parse(rawMessage);
      } catch (error) {
        componentAnalytics.logDeserializeMessageError(
          'unknown',
          error instanceof Error ? error : new Error(String(error))
        );
        cancelConnectBridgeRequest(replyContext);
        return;
      }

      if (message.type === 'fetchClientSecret') {
        const clientSecret = await fetchClientSecret().catch((error) => {
          handleUnexpectedError(error);
          return null;
        });
        if (!isCurrentBridgeRequest(replyContext)) return;
        if (!clientSecret) {
          replyToConnectBridge(replyContext, 'clientSecret', null);
          return;
        }

        replyToConnectBridge(replyContext, 'clientSecret', clientSecret);
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
      } else if (message.type === 'contentHeightChanged') {
        const height = (message.data as { height?: unknown })?.height;
        if (
          typeof height === 'number' &&
          Number.isFinite(height) &&
          height >= 0
        ) {
          onContentHeightChange?.(height);
        }
      } else if (message.type === 'accountSessionClaimed') {
        // message.data is of type {elementTagName: string, merchantId: string}
      } else if (message.type === 'openNotificationBannerForm') {
        if (message.data && typeof message.data === 'object') {
          onOpenNotificationBannerForm?.(
            message.data as Record<string, unknown>
          );
        }
      } else if (message.type === 'openFinancialConnections') {
        if (!replyContext.claimToken) return;
        const messageData = message.data as {
          clientSecret: string;
          id: string;
          connectedAccountId: string;
        };

        const { clientSecret, id, connectedAccountId } = messageData;

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
            replyContext
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
            replyContext
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
          if (pendingFinancialConnectionsPromise.current?.cleanup === cleanup) {
            pendingFinancialConnectionsPromise.current = null;
          }
        };

        pendingFinancialConnectionsPromise.current = {
          id,
          cleanup,
          replyContext,
        };

        const resultPromise: Promise<FinancialConnections.TokenResult> =
          NativeStripeSdk.collectBankAccountTokenFromConnect(
            clientSecret,
            { connectedAccountId },
            replyContext.claimToken
          );

        resultPromise
          .then((result) => {
            if (result.error) {
              if (
                result.error.code === FinancialConnectionsSheetError.Canceled
              ) {
                handleFinancialConnectionsResult(id, {}, replyContext);
                return;
              }

              handleFinancialConnectionsResult(
                id,
                {
                  error: result.error,
                },
                replyContext
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
                replyContext
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
              replyContext
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
              replyContext
            );
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
        if (!replyContext.claimToken) return;
        const { url, id } = message.data as { id: string; url: string };

        // Validate URL before opening
        if (!isValidAuthenticatedWebViewUrl(url)) {
          handleUnexpectedError(
            new Error('Invalid URL for authenticated webview')
          );
          handleAuthWebViewResult(id, null, replyContext);
          return;
        }

        const isAndroid = Platform.OS === 'android';
        const ownerToken = androidAuthOwnerToken.current;
        const nativeOperationId = isAndroid
          ? getNativeAuthOperationId(replyContext)
          : id;
        let resultReplied = false;
        const completeRequest = (authId: string, resultUrl: string | null) => {
          if (resultReplied) return;
          resultReplied = true;
          if (!isCurrentBridgeRequest(replyContext)) return;
          if (resultUrl) {
            componentAnalytics.logAuthenticatedWebViewRedirected(authId);
          } else {
            componentAnalytics.logAuthenticatedWebViewCanceled(authId);
          }
          handleAuthWebViewResult(authId, resultUrl, replyContext);
        };
        const pendingRequest = {
          id,
          callback: completeRequest,
        };

        if (isAndroid) {
          if (!reserveAndroidAuthOwner(ownerToken, nativeOperationId)) {
            componentAnalytics.logAuthenticatedWebViewError(
              id,
              new Error('Another authenticated webview is already active')
            );
            handleAuthWebViewResult(id, null, replyContext);
            return;
          }

          // Install the owner callback before launching Custom Tabs so an
          // immediate return URL cannot arrive before there is a pending entry.
          pendingAuthWebViewPromises.current.set(
            nativeOperationId,
            pendingRequest
          );
        }

        // Log authenticated web view opened
        componentAnalytics.logAuthenticatedWebViewOpened(id);

        // On Android, we need to wait for the deep link callback
        // On iOS, the promise resolves with the redirect URL
        NativeStripeSdk.openAuthenticatedWebViewFromConnect(
          nativeOperationId,
          url,
          replyContext.claimToken
        )
          .then((result) => {
            if (Platform.OS === 'ios') {
              if (result?.error) {
                const error = new Error(
                  result.error.message ||
                    result.error.code ||
                    'Authenticated web view could not be opened'
                );
                componentAnalytics.logAuthenticatedWebViewError(id, error);
                handleUnexpectedError(error);
                handleAuthWebViewResult(id, null, replyContext);
                return;
              }

              // iOS returns the redirect URL directly
              const resultUrl = result?.url ?? null;
              if (resultUrl) {
                componentAnalytics.logAuthenticatedWebViewRedirected(id);
              } else {
                componentAnalytics.logAuthenticatedWebViewCanceled(id);
              }
              handleAuthWebViewResult(id, resultUrl, replyContext);
            }
          })
          .catch((error) => {
            if (isAndroid) {
              const pending =
                pendingAuthWebViewPromises.current.get(nativeOperationId);
              if (pending === pendingRequest) {
                if (pending.timeoutId) clearTimeout(pending.timeoutId);
                pendingAuthWebViewPromises.current.delete(nativeOperationId);
              }
              releaseAndroidAuthOwner(ownerToken, nativeOperationId);
              NativeStripeSdk.authWebViewDeepLinkHandled(
                nativeOperationId
              ).catch(() => {});
            }
            completeRequest(id, null);
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
      handleAuthWebViewResult,
      handleFinancialConnectionsResult,
      handleUnexpectedError,
      isCurrentBridgeRequest,
      cancelConnectBridgeRequest,
      onLoadError,
      onLoaderStart,
      onContentHeightChange,
      onOpenNotificationBannerForm,
      onPageDidLoad,
      replyToConnectBridge,
    ]
  );

  const onBridgeRequest = useCallback(
    (event: NativeSyntheticEvent<ConnectBridgeRequestEvent>) => {
      const {
        attachmentId,
        requestHandle,
        documentId,
        contextId: eventContextId,
        sourceGeneration: eventSourceGeneration,
        rawMessage,
      } = event.nativeEvent;
      const bridgeContainer = connectBridgeRef.current;
      if (
        !bridgeContainer ||
        !isCurrentBridgeOwner(eventContextId, eventSourceGeneration)
      ) {
        cancelConnectBridgeRequest({ attachmentId, requestHandle });
        return;
      }

      const claimId = `connect-claim-${nextBridgeClaimId.current++}`;
      const claimResult = new Promise<{
        admitted: boolean;
        claimToken?: string;
      }>((resolve) => {
        pendingBridgeClaimWaiters.current.set(claimId, {
          attachmentId,
          requestHandle,
          contextId: eventContextId,
          sourceGeneration: eventSourceGeneration,
          resolve,
        });
      });
      ConnectBridgeCommands.claim(
        bridgeContainer,
        claimId,
        attachmentId,
        requestHandle,
        documentId,
        eventContextId,
        eventSourceGeneration
      );
      claimResult
        .then(({ admitted, claimToken }) => {
          if (
            !admitted ||
            !isCurrentBridgeOwner(eventContextId, eventSourceGeneration)
          ) {
            cancelConnectBridgeRequest({ attachmentId, requestHandle });
            return;
          }
          return onMessageCallback(rawMessage, {
            attachmentId,
            requestHandle,
            documentId,
            contextId: eventContextId,
            sourceGeneration: eventSourceGeneration,
            claimToken,
          });
        })
        .catch((error: unknown) => {
          cancelConnectBridgeRequest({ attachmentId, requestHandle });
          handleUnexpectedError(error);
        });
    },
    [
      cancelConnectBridgeRequest,
      handleUnexpectedError,
      isCurrentBridgeOwner,
      onMessageCallback,
    ]
  );

  const onBridgeClaimResult = useCallback(
    (event: NativeSyntheticEvent<ConnectBridgeClaimResultEvent>) => {
      const result = event.nativeEvent;
      const waiter = pendingBridgeClaimWaiters.current.get(result.claimId);
      if (!waiter) return;
      pendingBridgeClaimWaiters.current.delete(result.claimId);
      const admitted =
        result.admitted &&
        waiter.attachmentId === result.attachmentId &&
        waiter.requestHandle === result.requestHandle &&
        waiter.sourceGeneration === result.sourceGeneration &&
        isCurrentBridgeOwner(waiter.contextId, waiter.sourceGeneration);
      if (!admitted) {
        cancelConnectBridgeRequest(waiter);
      }
      waiter.resolve({
        admitted,
        claimToken: admitted ? result.claimToken : undefined,
      });
    },
    [cancelConnectBridgeRequest, isCurrentBridgeOwner]
  );

  const onBridgeError = useCallback(
    (event: NativeSyntheticEvent<ConnectBridgeErrorEvent>) => {
      onLoadError?.({
        elementTagName: component,
        error: {
          type: 'render_error',
          message: getConnectBridgeErrorMessage(event.nativeEvent.error),
        },
      });
    },
    [component, onLoadError]
  );

  const openUrlOutsideComponent = useCallback(
    (url: string) => {
      const result =
        presentExternalLinksInApp && isValidUrl(url)
          ? NativeStripeSdk.presentExternalWebPage(url)
          : Linking.openURL(url);

      result.catch(handleUnexpectedError);
    },
    [handleUnexpectedError, presentExternalLinksInApp]
  );

  const onOpenWindow = useCallback(
    (event: WebViewOpenWindowEvent) => {
      openUrlOutsideComponent(event.nativeEvent.targetUrl);
    },
    [openUrlOutsideComponent]
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
      if (isAllowedStripeHost(url)) {
        return true; // Allow in-WebView navigation
      }

      openUrlOutsideComponent(url);

      return false; // Block in-WebView navigation for external links
    },
    [handleUnexpectedError, openUrlOutsideComponent]
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

  if (!WebViewComponent) return null;

  return (
    <NativeConnectBridgeContainer
      ref={connectBridgeRef}
      style={mergedStyle}
      contextId={connectContextId}
      sourceGeneration={sourceGeneration}
      connectSource={connectURL}
      initializationObjectJson={JSON.stringify(injectedObject)}
      observeContentHeight={Boolean(sizeToContent)}
      onBridgeRequest={onBridgeRequest}
      onBridgeClaimResult={onBridgeClaimResult}
      onBridgeError={onBridgeError}
    >
      <WebViewComponent
        style={styles.webview}
        renderLoading={() => {
          return (
            <View
              style={[styles.loadingIndicatorContainer, { backgroundColor }]}
            >
              <ActivityIndicator color={textColor} />
            </View>
          );
        }}
        webviewDebuggingEnabled={DEVELOPMENT_MODE}
        userAgent={userAgent}
        onOpenWindow={presentExternalLinksInApp ? onOpenWindow : undefined}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onLayout={handleLayout}
        // Camera/Media Permissions - matches iOS SDK behavior
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </NativeConnectBridgeContainer>
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

function isValidAuthenticatedWebViewUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname.length > 0 &&
      parsedUrl.username.length === 0 &&
      parsedUrl.password.length === 0
    );
  } catch {
    return false;
  }
}

function getConnectBridgeErrorMessage(error: string): string {
  switch (error) {
    case 'unsupported_web_view':
      return 'Embedded components require a supported react-native-webview version.';
    case 'multiple_web_views':
      return 'Embedded components must contain exactly one WebView.';
    case 'invalid_connect_source':
      return 'Embedded components could not load because the Connect URL is invalid.';
    default:
      return 'Embedded components could not initialize. Check the WebView configuration and try again.';
  }
}

export function isAllowedStripeHost(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_STRIPE_HOSTS.some(
      (host) => parsedUrl.hostname === host || parsedUrl.host === host
    );
  } catch {
    return false;
  }
}

// Detects Stripe CSV export URLs
function isCsvExportUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'stripe-data-exports.com' ||
      parsedUrl.hostname.endsWith('.stripe-data-exports.com') ||
      parsedUrl.pathname.includes('stripe-data-exports')
    );
  } catch {
    return false;
  }
}
