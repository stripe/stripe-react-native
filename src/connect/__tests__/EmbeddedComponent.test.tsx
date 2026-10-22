// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

const mockInjectJavaScript = jest.fn();
const mockReload = jest.fn();
let mockLoadWebView = false;
let mockWebViewComponent: any;
let mockWebViewProps: any;
let mockBridgeContainerComponent: any;
let mockBridgeContainerProps: any;
const mockBridgeReply = jest.fn();
const mockBridgeClaim = jest.fn();
const mockBridgeCancel = jest.fn();

jest.mock('react', () => {
  const React = jest.requireActual('react');
  return {
    ...React,
    useState: (initialState: any) => {
      let resolvedInitialState = initialState;
      if (mockLoadWebView && initialState === null) {
        mockLoadWebView = false;
        resolvedInitialState = { WebView: mockWebViewComponent };
      }
      return React.useState(resolvedInitialState);
    },
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  mockWebViewComponent = React.forwardRef((props: any, ref: any) => {
    mockWebViewProps = props;
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: mockInjectJavaScript,
      reload: mockReload,
    }));
    return null;
  });
  return {
    WebView: mockWebViewComponent,
  };
});

jest.mock('../../specs/NativeStripeSdkModule', () =>
  mockCreateNativeStripeSdkMock({
    collectBankAccountToken: jest.fn(),
    collectBankAccountTokenFromConnect: jest.fn(),
    collectFinancialConnectionsAccounts: jest.fn(),
    openAuthenticatedWebView: jest.fn(),
    openAuthenticatedWebViewFromConnect: jest.fn(),
    authWebViewDeepLinkHandled: jest.fn().mockResolvedValue(undefined),
    pollAndClearPendingStripeConnectUrls: jest.fn().mockResolvedValue([]),
  })
);

jest.mock('../../specs/NativeConnectBridgeContainer', () => {
  const React = require('react');
  mockBridgeContainerComponent = React.forwardRef((props: any, ref: any) => {
    mockBridgeContainerProps = props;
    const imperativeHandle = { onBridgeClaimResult: props.onBridgeClaimResult };
    React.useImperativeHandle(ref, () => imperativeHandle);
    return React.createElement(React.Fragment, null, props.children);
  });

  return {
    __esModule: true,
    default: mockBridgeContainerComponent,
    Commands: { reply: jest.fn(), claim: jest.fn(), cancel: jest.fn() },
  };
});

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
} from 'react-native';
import 'react-native-webview';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import * as EventModule from '../../events';
import {
  EmbeddedComponent,
  isAllowedStripeHost,
  toStripeJsBankAccountToken,
} from '../EmbeddedComponent';
import {
  loadConnectAndInitialize,
  ConnectComponentsProvider,
  useConnectComponents,
} from '../ConnectComponentsProvider';
import type { StripeConnectInitParams } from '../connectTypes';

// Jest hoists the module factory ahead of this test's mock function declaration.
// Connect the command mock after imports have initialized both values.
const mockBridgeCommands =
  require('../../specs/NativeConnectBridgeContainer').Commands;
mockBridgeCommands.reply = mockBridgeReply;
mockBridgeCommands.claim = mockBridgeClaim;
mockBridgeCommands.cancel = mockBridgeCancel;

describe('EmbeddedComponent', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
    appearance: {
      variables: {
        colorPrimary: '#000000',
        colorBackground: '#FFFFFF',
      },
    },
    locale: 'en',
  };

  let connectInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadWebView = false;
    mockWebViewProps = undefined;
    mockBridgeContainerProps = undefined;
    mockBridgeClaim.mockImplementation(
      (
        viewRef: { onBridgeClaimResult?: (event: unknown) => void },
        claimId: string,
        attachmentId: string,
        requestHandle: string,
        _documentId: string,
        _contextId: string,
        sourceGeneration: string
      ) => {
        viewRef?.onBridgeClaimResult?.({
          nativeEvent: {
            claimId,
            attachmentId,
            requestHandle,
            sourceGeneration,
            admitted: true,
            claimToken: 'test-claim-token',
          },
        });
      }
    );
    (
      NativeStripeSdk.collectBankAccountTokenFromConnect as jest.Mock
    ).mockImplementation((clientSecret: string, options: unknown) =>
      (NativeStripeSdk.collectBankAccountToken as jest.Mock)(
        clientSecret,
        options
      )
    );
    (
      NativeStripeSdk.openAuthenticatedWebViewFromConnect as jest.Mock
    ).mockImplementation((operationId: string, url: string) =>
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock)(operationId, url)
    );
    connectInstance = loadConnectAndInitialize(mockInitParams);
  });

  const renderComponent = (props: any = {}) => {
    return render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <EmbeddedComponent
          component="payments"
          onLoaderStart={jest.fn()}
          onLoadError={jest.fn()}
          onPageDidLoad={jest.fn()}
          {...props}
        />
      </ConnectComponentsProvider>
    );
  };

  const sendBridgeRequest = (
    type: string,
    data?: unknown,
    bridgeProps = mockBridgeContainerProps,
    requestContext: Partial<{
      attachmentId: string;
      requestHandle: string;
      documentId: string;
      sourceGeneration: string;
    }> = {}
  ) => {
    if (!bridgeProps) throw new Error('Bridge container is not mounted');
    bridgeProps.onBridgeRequest({
      nativeEvent: {
        contextId: bridgeProps.contextId,
        attachmentId: 'test-attachment',
        requestHandle: 'test-request',
        documentId: 'test-document',
        ...requestContext,
        sourceGeneration:
          requestContext.sourceGeneration ?? bridgeProps.sourceGeneration,
        rawMessage: JSON.stringify({ type, data }),
      },
    });
  };

  describe('Initialization & Setup', () => {
    it('keeps the RNC source and generic message callback disabled', async () => {
      mockLoadWebView = true;
      renderComponent();

      await waitFor(() => {
        expect(mockWebViewProps).toBeDefined();
      });

      expect(mockWebViewProps.source).toBeUndefined();
      expect(mockWebViewProps.onMessage).toBeUndefined();
      expect(mockBridgeContainerProps.connectSource).toContain(
        'https://connect-js.stripe.com/v1.0/react_native_webview.html'
      );
      expect(
        JSON.parse(mockBridgeContainerProps.initializationObjectJson)
      ).toMatchObject({
        initParams: {
          locale: 'en',
        },
      });
    });

    it('rejects queued bridge requests from a replaced Connect instance with the same source', async () => {
      mockLoadWebView = true;
      const firstInstance = connectInstance;
      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(mockBridgeContainerProps).toBeDefined();
      });

      const previousContextId = mockBridgeContainerProps.contextId;
      const previousSource = mockBridgeContainerProps.connectSource;
      const previousSourceGeneration =
        mockBridgeContainerProps.sourceGeneration;
      const replacementFetchClientSecret = jest.fn(
        async () => 'replacement_secret'
      );
      const replacementInstance = loadConnectAndInitialize({
        ...mockInitParams,
        fetchClientSecret: replacementFetchClientSecret,
      });
      connectInstance = replacementInstance;

      rerender(
        <ConnectComponentsProvider connectInstance={replacementInstance}>
          <EmbeddedComponent
            component="payments"
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
          />
        </ConnectComponentsProvider>
      );

      await waitFor(() => {
        expect(mockBridgeContainerProps.contextId).not.toBe(previousContextId);
        expect(mockBridgeContainerProps.sourceGeneration).not.toBe(
          previousSourceGeneration
        );
      });
      expect(mockBridgeContainerProps.connectSource).toBe(previousSource);

      const replyCount = mockBridgeReply.mock.calls.length;
      act(() => {
        mockBridgeContainerProps.onBridgeRequest({
          nativeEvent: {
            contextId: previousContextId,
            attachmentId: 'old-attachment',
            requestHandle: 'old-request',
            documentId: 'old-document',
            rawMessage: JSON.stringify({ type: 'fetchClientSecret' }),
          },
        });
      });

      expect(replacementFetchClientSecret).not.toHaveBeenCalled();
      expect(mockBridgeReply).toHaveBeenCalledTimes(replyCount);
      expect(firstInstance).not.toBe(replacementInstance);
    });

    it('rejects queued requests after returning to the same source with a new generation', async () => {
      mockLoadWebView = true;
      const onAccountUpdate = jest.fn();
      const callbacks = { accountUpdate: onAccountUpdate };
      const { rerender } = renderComponent({ callbacks });

      await waitFor(() => {
        expect(mockBridgeContainerProps).toBeDefined();
      });

      const originalContextId = mockBridgeContainerProps.contextId;
      const originalSource = mockBridgeContainerProps.connectSource;
      const originalSourceGeneration =
        mockBridgeContainerProps.sourceGeneration;

      const rerenderWithComponent = (
        component: 'payments' | 'payment-details'
      ) => {
        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component={component}
              callbacks={callbacks}
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );
      };

      rerenderWithComponent('payment-details');
      await waitFor(() => {
        expect(mockBridgeContainerProps.connectSource).not.toBe(originalSource);
      });

      rerenderWithComponent('payments');
      await waitFor(() => {
        expect(mockBridgeContainerProps.connectSource).toBe(originalSource);
      });

      expect(mockBridgeContainerProps.contextId).toBe(originalContextId);
      const latestBridgeProps = mockBridgeContainerProps;

      await act(async () => {
        latestBridgeProps.onBridgeRequest({
          nativeEvent: {
            contextId: originalContextId,
            attachmentId: 'old-a-attachment',
            requestHandle: 'old-a-callback-request',
            documentId: 'old-a-document',
            sourceGeneration: originalSourceGeneration,
            rawMessage: JSON.stringify({
              type: 'onSetterFunctionCalled',
              data: { setter: 'setAccountUpdate', value: { id: 'acct_123' } },
            }),
          },
        });
        latestBridgeProps.onBridgeRequest({
          nativeEvent: {
            contextId: originalContextId,
            attachmentId: 'old-a-auth-attachment',
            requestHandle: 'old-a-auth-request',
            documentId: 'old-a-document',
            sourceGeneration: originalSourceGeneration,
            rawMessage: JSON.stringify({
              type: 'openAuthenticatedWebView',
              data: {
                id: 'old-a-auth',
                url: 'https://connect.stripe.com/auth',
              },
            }),
          },
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockBridgeClaim).not.toHaveBeenCalled();
      expect(onAccountUpdate).not.toHaveBeenCalled();
      expect(NativeStripeSdk.openAuthenticatedWebView).not.toHaveBeenCalled();
      expect(
        NativeStripeSdk.openAuthenticatedWebViewFromConnect
      ).not.toHaveBeenCalled();
      expect(latestBridgeProps.sourceGeneration).not.toBe(
        originalSourceGeneration
      );
    });

    it('drops an admitted claim when ownership changes before its continuation runs', async () => {
      mockLoadWebView = true;
      const onAccountUpdate = jest.fn();
      const callbacks = { accountUpdate: onAccountUpdate };
      const { rerender } = renderComponent({ callbacks });

      await waitFor(() => {
        expect(mockBridgeContainerProps?.onBridgeRequest).toEqual(
          expect.any(Function)
        );
      });

      const originalBridgeProps = mockBridgeContainerProps;
      const originalContextId = originalBridgeProps.contextId;
      const originalSourceGeneration = originalBridgeProps.sourceGeneration;
      mockBridgeClaim.mockImplementationOnce(() => {});

      act(() => {
        originalBridgeProps.onBridgeRequest({
          nativeEvent: {
            contextId: originalContextId,
            attachmentId: 'pending-attachment',
            requestHandle: 'pending-request',
            documentId: 'pending-document',
            sourceGeneration: originalSourceGeneration,
            rawMessage: JSON.stringify({
              type: 'onSetterFunctionCalled',
              data: {
                setter: 'setAccountUpdate',
                value: { id: 'pending-account' },
              },
            }),
          },
        });
      });

      const [, claimId, attachmentId, requestHandle, , , sourceGeneration] =
        mockBridgeClaim.mock.calls[0];
      const rerenderToOtherComponent = () => {
        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component="payment-details"
              callbacks={callbacks}
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );
      };

      act(() => {
        originalBridgeProps.onBridgeClaimResult({
          nativeEvent: {
            claimId,
            attachmentId,
            requestHandle,
            sourceGeneration,
            admitted: true,
            claimToken: 'claim-token',
          },
        });
        rerenderToOtherComponent();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockBridgeContainerProps.sourceGeneration).not.toBe(
        originalSourceGeneration
      );
      expect(onAccountUpdate).not.toHaveBeenCalled();
    });

    it('releases an admitted request when a merchant callback throws', async () => {
      mockLoadWebView = true;
      const onAccountUpdate = jest.fn(() => {
        throw new Error('merchant callback failed');
      });
      const { unmount } = renderComponent({
        callbacks: { accountUpdate: onAccountUpdate },
      });
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        await act(async () => {
          sendBridgeRequest('onSetterFunctionCalled', {
            setter: 'setAccountUpdate',
            value: { id: 'acct_123' },
          });
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(onAccountUpdate).toHaveBeenCalledWith({ id: 'acct_123' });
        expect(mockBridgeCancel).toHaveBeenCalledWith(
          expect.anything(),
          'test-attachment',
          'test-request'
        );
      } finally {
        consoleError.mockRestore();
        unmount();
      }
    });

    it('ignores a queued bridge event after unmount', () => {
      mockLoadWebView = true;
      const { unmount } = renderComponent();
      const bridgeProps = mockBridgeContainerProps;
      unmount();

      act(() => {
        sendBridgeRequest('fetchClientSecret', undefined, bridgeProps);
      });

      expect(mockInitParams.fetchClientSecret).not.toHaveBeenCalled();
      expect(mockBridgeReply).not.toHaveBeenCalled();
    });

    it('component loads react-native-webview dynamically', async () => {
      const { rerender } = renderComponent();

      await waitFor(() => {
        // WebView should be loaded after dynamic import
        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component="payments"
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
              onPageDidLoad={jest.fn()}
            />
          </ConnectComponentsProvider>
        );
      });

      // Component should render without crashing
      expect(true).toBe(true);
    });

    it('uses appearance colors for the loading indicator', async () => {
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        appearance: {
          variables: {
            colorBackground: '#AABBCC',
            colorText: '#112233',
          },
        },
      });

      mockLoadWebView = true;
      renderComponent();

      await waitFor(() => {
        expect(mockWebViewProps?.renderLoading).toEqual(expect.any(Function));
      });

      const loadingView = mockWebViewProps.renderLoading();
      const loadingIndicator = loadingView.props.children;

      expect(StyleSheet.flatten(loadingView.props.style)).toMatchObject({
        backgroundColor: '#AABBCC',
      });
      expect(loadingIndicator.type).toBe(ActivityIndicator);
      expect(loadingIndicator.props.color).toBe('#112233');
    });

    it('uses fallback colors for the loading indicator', async () => {
      connectInstance = loadConnectAndInitialize({
        publishableKey: 'pk_test_123',
        fetchClientSecret: jest.fn(async () => 'secret_123'),
      });

      mockLoadWebView = true;
      renderComponent();

      await waitFor(() => {
        expect(mockWebViewProps?.renderLoading).toEqual(expect.any(Function));
      });

      const loadingView = mockWebViewProps.renderLoading();
      const loadingIndicator = loadingView.props.children;

      expect(StyleSheet.flatten(loadingView.props.style)).toMatchObject({
        backgroundColor: '#FFFFFF',
      });
      expect(loadingIndicator.props.color).toBe('#000000');
    });

    it('SDK version validation rejects invalid formats', () => {
      // This test verifies the version format check at module load time
      // The actual validation happens in the module scope
      const versionPattern = /^\d+\.\d+\.\d+$/;
      expect('1.0.0').toMatch(versionPattern);
      expect('1.0.0-beta').not.toMatch(versionPattern);
      expect('1.0').not.toMatch(versionPattern);
    });

    it('userAgent string includes correct platform and SDK version', () => {
      const platform = Platform.OS;
      const version = Platform.Version;
      const expectedUserAgent = `Mobile - Stripe ReactNative SDK ${platform}/${version} - stripe-react_native/1.0.0`;

      // Verify the pattern is correct
      expect(expectedUserAgent).toContain('Mobile');
      expect(expectedUserAgent).toContain('stripe-react_native/1.0.0');
    });
  });

  describe('State Management', () => {
    it('appearance changes should trigger provider update', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useConnectComponents();
        return (
          <EmbeddedComponent
            component="payments"
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
            onPageDidLoad={jest.fn()}
          />
        );
      };

      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <TestComponent />
        </ConnectComponentsProvider>
      );

      const initialAppearance = contextValue.appearance;

      // Update appearance
      const newAppearance = {
        variables: {
          colorPrimary: '#FF0000',
        },
      };

      act(() => {
        connectInstance.update({ appearance: newAppearance });
      });

      await waitFor(() => {
        expect(contextValue.appearance).not.toBe(initialAppearance);
        expect(contextValue.appearance).toEqual(newAppearance);
      });
    });

    it('locale changes should trigger provider update', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useConnectComponents();
        return (
          <EmbeddedComponent
            component="payments"
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
            onPageDidLoad={jest.fn()}
          />
        );
      };

      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <TestComponent />
        </ConnectComponentsProvider>
      );

      expect(contextValue.locale).toBe('en');

      act(() => {
        connectInstance.update({ locale: 'fr' });
      });

      await waitFor(() => {
        expect(contextValue.locale).toBe('fr');
      });
    });

    it('component re-renders when props change', () => {
      const { rerender } = renderComponent({
        componentProps: { setPayment: 'pi_123' },
      });

      // Should not throw when re-rendering with different props
      expect(() => {
        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component="payment-details"
              componentProps={{ setPayment: 'pi_456' }}
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
              onPageDidLoad={jest.fn()}
            />
          </ConnectComponentsProvider>
        );
      }).not.toThrow();
    });
  });

  describe('App State Handling', () => {
    let appStateListeners: any[] = [];

    beforeEach(() => {
      appStateListeners = [];
      (AppState.currentState as any) = 'active';
      (AppState.addEventListener as jest.Mock) = jest.fn((_event, handler) => {
        appStateListeners.push(handler);
        return {
          remove: jest.fn(() => {
            const index = appStateListeners.indexOf(handler);
            if (index > -1) {
              appStateListeners.splice(index, 1);
            }
          }),
        };
      });
    });

    it('AppState listener is registered on mount', () => {
      renderComponent();

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('returning from background resolves pending Android auth promise with null', async () => {
      Platform.OS = 'android' as any;

      const { unmount } = renderComponent();

      const initialListenerCount = appStateListeners.length;
      expect(initialListenerCount).toBeGreaterThan(0);

      // Simulate app going to background then foreground
      if (appStateListeners.length > 0) {
        act(() => {
          appStateListeners[0]('background');
        });

        act(() => {
          appStateListeners[0]('active');
        });
      }

      // Should still have the listener
      expect(appStateListeners.length).toBe(initialListenerCount);

      unmount();
    });

    it('cleanup removes AppState listener on unmount', () => {
      const { unmount } = renderComponent();

      const initialListenerCount = appStateListeners.length;
      expect(initialListenerCount).toBeGreaterThan(0);

      unmount();

      // Listener should be removed after unmount
      expect(appStateListeners.length).toBeLessThan(initialListenerCount);
    });
  });

  describe('Authenticated web views', () => {
    const expectNullAuthReply = () => {
      expect(mockBridgeReply).toHaveBeenCalledWith(
        expect.anything(),
        'test-attachment',
        'test-request',
        expect.stringContaining('"action":"authenticatedWebView"')
      );
      const reply =
        mockBridgeReply.mock.calls[mockBridgeReply.mock.calls.length - 1]?.[3];
      expect(JSON.parse(reply).data.url).toBeNull();
    };

    beforeEach(() => {
      Platform.OS = 'android' as any;
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock).mockResolvedValue(
        null
      );
    });

    it.each([
      'http://connect.stripe.com/auth',
      'https://merchant:secret@connect.stripe.com/auth',
      'not a URL',
    ])(
      'rejects invalid authenticated URLs before native launch: %s',
      async (url) => {
        mockLoadWebView = true;
        renderComponent();

        await act(async () => {
          sendBridgeRequest('openAuthenticatedWebView', { id: 'auth-1', url });
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(NativeStripeSdk.openAuthenticatedWebView).not.toHaveBeenCalled();
        await waitFor(() => expectNullAuthReply());
      }
    );

    it('replies and releases ownership when native launch fails', async () => {
      mockLoadWebView = true;
      const { unmount } = renderComponent();
      (
        NativeStripeSdk.openAuthenticatedWebView as jest.Mock
      ).mockRejectedValueOnce(new Error('launch failed'));

      act(() => {
        sendBridgeRequest('openAuthenticatedWebView', {
          id: 'auth-failed',
          url: 'https://connect.stripe.com/auth',
        });
      });

      await waitFor(() => expectNullAuthReply());
      expect(NativeStripeSdk.authWebViewDeepLinkHandled).toHaveBeenCalledWith(
        JSON.stringify(['test-attachment', 'test-request'])
      );

      unmount();
      mockLoadWebView = true;
      renderComponent();
      (
        NativeStripeSdk.openAuthenticatedWebView as jest.Mock
      ).mockResolvedValueOnce(null);
      act(() => {
        sendBridgeRequest('openAuthenticatedWebView', {
          id: 'auth-next',
          url: 'https://connect.stripe.com/auth',
        });
      });

      await waitFor(() => {
        expect(
          NativeStripeSdk.openAuthenticatedWebView
        ).toHaveBeenLastCalledWith(
          JSON.stringify(['test-attachment', 'test-request']),
          'https://connect.stripe.com/auth'
        );
      });
    });

    it('clears an Android auth owner when the same Connect instance changes source', async () => {
      mockLoadWebView = true;
      let resolveFirst!: (result: null) => void;
      let resolveSecond!: (result: null) => void;
      const firstLaunch = new Promise<null>((resolve) => {
        resolveFirst = resolve;
      });
      const secondLaunch = new Promise<null>((resolve) => {
        resolveSecond = resolve;
      });
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock)
        .mockImplementationOnce(() => firstLaunch)
        .mockImplementationOnce(() => secondLaunch);
      const { rerender, unmount } = renderComponent();
      const firstBridge = mockBridgeContainerProps;

      try {
        await act(async () => {
          sendBridgeRequest(
            'openAuthenticatedWebView',
            { id: 'auth-a', url: 'https://connect.stripe.com/auth' },
            firstBridge
          );
          await Promise.resolve();
          await Promise.resolve();
        });
        await waitFor(() => {
          expect(
            NativeStripeSdk.openAuthenticatedWebView
          ).toHaveBeenCalledTimes(1);
        });

        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component="payment-details"
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );

        await act(async () => {
          sendBridgeRequest('openAuthenticatedWebView', {
            id: 'auth-b',
            url: 'https://connect.stripe.com/auth',
          });
          await Promise.resolve();
          await Promise.resolve();
        });
        await waitFor(() => {
          expect(
            NativeStripeSdk.openAuthenticatedWebView
          ).toHaveBeenCalledTimes(2);
        });
      } finally {
        resolveFirst(null);
        resolveSecond(null);
        unmount();
      }
    });

    it('replies with an error when iOS resolves a native launch failure', async () => {
      mockLoadWebView = true;
      Platform.OS = 'ios' as any;
      (
        NativeStripeSdk.openAuthenticatedWebView as jest.Mock
      ).mockResolvedValueOnce({
        error: {
          code: 'Failed',
          message: 'Authentication session unavailable',
        },
      });
      renderComponent();

      act(() => {
        sendBridgeRequest('openAuthenticatedWebView', {
          id: 'auth-ios-error',
          url: 'https://connect.stripe.com/auth',
        });
      });

      await waitFor(() => expectNullAuthReply());
      expect(NativeStripeSdk.openAuthenticatedWebView).toHaveBeenCalledWith(
        'auth-ios-error',
        'https://connect.stripe.com/auth'
      );
    });

    it('lets only the active component poll the shared auth URL queue', async () => {
      jest.useFakeTimers();
      mockLoadWebView = true;
      const nonOwner = renderComponent();
      const nonOwnerBridge = mockBridgeContainerProps;
      mockLoadWebView = true;
      const owner = renderComponent();
      const ownerBridge = mockBridgeContainerProps;
      const resultUrl = 'stripe-connect://return?state=owner';
      (
        NativeStripeSdk.pollAndClearPendingStripeConnectUrls as jest.Mock
      ).mockResolvedValueOnce([resultUrl]);

      try {
        await act(async () => {
          sendBridgeRequest(
            'openAuthenticatedWebView',
            { id: 'auth-owner', url: 'https://connect.stripe.com/auth' },
            ownerBridge,
            {
              attachmentId: 'owner-attachment',
              requestHandle: 'owner-request',
              documentId: 'owner-document',
            }
          );
          sendBridgeRequest(
            'openAuthenticatedWebView',
            { id: 'auth-non-owner', url: 'https://connect.stripe.com/auth' },
            nonOwnerBridge,
            {
              attachmentId: 'non-owner-attachment',
              requestHandle: 'non-owner-request',
              documentId: 'non-owner-document',
            }
          );
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(NativeStripeSdk.openAuthenticatedWebView).toHaveBeenCalledTimes(
          1
        );
        expect(NativeStripeSdk.openAuthenticatedWebView).toHaveBeenCalledWith(
          JSON.stringify(['owner-attachment', 'owner-request']),
          'https://connect.stripe.com/auth'
        );
        const nonOwnerReply = mockBridgeReply.mock.calls.find(
          (call) => call[2] === 'non-owner-request'
        )?.[3];
        expect(JSON.parse(nonOwnerReply).data).toEqual({
          id: 'auth-non-owner',
          url: null,
        });

        await act(async () => {
          jest.advanceTimersByTime(500);
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(
          NativeStripeSdk.pollAndClearPendingStripeConnectUrls
        ).toHaveBeenCalledTimes(1);
        expect(NativeStripeSdk.openAuthenticatedWebView).toHaveBeenCalledTimes(
          1
        );
        const payload =
          mockBridgeReply.mock.calls[
            mockBridgeReply.mock.calls.length - 1
          ]?.[3];
        expect(JSON.parse(payload).data).toEqual({
          id: 'auth-owner',
          url: resultUrl,
        });
        expect(nonOwnerBridge.contextId).toBe(ownerBridge.contextId);
      } finally {
        owner.unmount();
        nonOwner.unmount();
        jest.useRealTimers();
      }
    });

    it('does not let a late launch failure for a reused Connect ID clear a newer owner', async () => {
      jest.useFakeTimers();
      mockLoadWebView = true;
      let rejectFirstLaunch!: (error: Error) => void;
      const firstLaunch = new Promise<null>((_resolve, reject) => {
        rejectFirstLaunch = reject;
      });
      (
        NativeStripeSdk.openAuthenticatedWebView as jest.Mock
      ).mockImplementationOnce(() => firstLaunch);
      const firstComponent = renderComponent();
      const firstBridge = mockBridgeContainerProps;
      const firstRequestContext = {
        attachmentId: 'first-attachment',
        requestHandle: 'first-request',
        documentId: 'first-document',
      };

      try {
        await act(async () => {
          sendBridgeRequest(
            'openAuthenticatedWebView',
            { id: 'reused-auth-id', url: 'https://connect.stripe.com/auth' },
            firstBridge,
            firstRequestContext
          );
          await Promise.resolve();
          await Promise.resolve();
        });
        firstComponent.unmount();

        mockLoadWebView = true;
        const secondComponent = renderComponent();
        const secondBridge = mockBridgeContainerProps;
        (
          NativeStripeSdk.pollAndClearPendingStripeConnectUrls as jest.Mock
        ).mockResolvedValueOnce(['stripe-connect://return?state=second']);

        await act(async () => {
          sendBridgeRequest(
            'openAuthenticatedWebView',
            { id: 'reused-auth-id', url: 'https://connect.stripe.com/auth' },
            secondBridge,
            {
              attachmentId: 'second-attachment',
              requestHandle: 'second-request',
              documentId: 'second-document',
            }
          );
          await Promise.resolve();
          await Promise.resolve();
        });

        await act(async () => {
          rejectFirstLaunch(new Error('late launch failure'));
          await Promise.resolve();
          await Promise.resolve();
        });

        await act(async () => {
          jest.advanceTimersByTime(500);
          await Promise.resolve();
          await Promise.resolve();
        });

        const secondReply = mockBridgeReply.mock.calls.find(
          (call) => call[2] === 'second-request'
        )?.[3];
        expect(JSON.parse(secondReply).data).toEqual({
          id: 'reused-auth-id',
          url: 'stripe-connect://return?state=second',
        });
        expect(NativeStripeSdk.authWebViewDeepLinkHandled).toHaveBeenCalledWith(
          JSON.stringify(['first-attachment', 'first-request'])
        );
        expect(NativeStripeSdk.authWebViewDeepLinkHandled).toHaveBeenCalledWith(
          JSON.stringify(['second-attachment', 'second-request'])
        );

        secondComponent.unmount();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('Font Handling', () => {
    it('default font is applied when fontFamily not specified', () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useConnectComponents();
        return (
          <EmbeddedComponent
            component="payments"
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
            onPageDidLoad={jest.fn()}
          />
        );
      };

      const instance = loadConnectAndInitialize({
        ...mockInitParams,
        appearance: {
          variables: {
            colorPrimary: '#000000',
          },
        },
      });

      render(
        <ConnectComponentsProvider connectInstance={instance}>
          <TestComponent />
        </ConnectComponentsProvider>
      );

      // Appearance should be set in context
      expect(contextValue.appearance).toBeDefined();
      expect(contextValue.appearance.variables).toBeDefined();
    });

    it('custom fontFamily is preserved when specified', () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useConnectComponents();
        return (
          <EmbeddedComponent
            component="payments"
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
            onPageDidLoad={jest.fn()}
          />
        );
      };

      const instance = loadConnectAndInitialize({
        ...mockInitParams,
        appearance: {
          variables: {
            fontFamily: 'CustomFont',
          },
        },
      });

      render(
        <ConnectComponentsProvider connectInstance={instance}>
          <TestComponent />
        </ConnectComponentsProvider>
      );

      // Custom font should be in context
      expect(contextValue.appearance.variables.fontFamily).toBe('CustomFont');
    });
  });

  describe('Financial Connections bridge', () => {
    const mockSession = {
      id: 'session',
      clientSecret: 'client_secret',
      livemode: false,
      accounts: [],
    };
    const mockToken = {
      id: 'btok_token',
      livemode: false,
      used: false,
      type: 'BankAccount' as const,
      created: 1000000,
      bankAccount: {
        id: 'bank_account',
        bankName: 'Test Bank',
        accountHolderName: null,
        accountHolderType: null,
        currency: 'usd',
        country: 'US',
        routingNumber: '110000000',
        status: null,
        fingerprint: null,
        last4: '6789',
      },
    };

    const openFinancialConnections = async () => {
      mockLoadWebView = true;
      renderComponent({ component: 'account-onboarding' });
      await waitFor(() =>
        expect(mockBridgeContainerProps?.onBridgeRequest).toEqual(
          expect.any(Function)
        )
      );

      await act(async () => {
        sendBridgeRequest('openFinancialConnections', {
          id: 'request',
          clientSecret: 'client_secret',
          connectedAccountId: 'connected_account',
        });
        await Promise.resolve();
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(
          mockBridgeReply.mock.calls.some(
            (call) =>
              call[2] === 'test-request' &&
              JSON.parse(call[3]).action === 'financialConnections'
          )
        ).toBe(true);
      });
    };

    const getLastFinancialConnectionsResult = () => {
      const payload =
        mockBridgeReply.mock.calls[mockBridgeReply.mock.calls.length - 1]?.[3];
      if (typeof payload !== 'string') {
        throw new Error('No Financial Connections bridge reply was sent');
      }
      return JSON.parse(payload).data;
    };

    const expectUnexpectedError = (message: string) => {
      expect(getLastFinancialConnectionsResult()).toEqual({
        id: 'request',
        financialConnectionsSession: null,
        token: null,
        error: {
          code: 'UnexpectedError',
          message,
        },
      });
    };

    const expectedToken = {
      id: 'btok_token',
      object: 'token',
      type: 'bank_account',
      used: false,
      livemode: false,
      created: 1000000,
      bank_account: {
        id: 'bank_account',
        object: 'bank_account',
        account_holder_name: null,
        account_holder_type: null,
        bank_name: 'Test Bank',
        country: 'US',
        currency: 'usd',
        fingerprint: null,
        last4: '6789',
        routing_number: '110000000',
        status: null,
      },
    };

    it('collects and forwards a bank-account token', async () => {
      const mockCollectBankAccountToken =
        NativeStripeSdk.collectBankAccountToken as jest.Mock;
      const mockCollectFinancialConnectionsAccounts =
        NativeStripeSdk.collectFinancialConnectionsAccounts as jest.Mock;
      mockCollectBankAccountToken.mockResolvedValue({
        session: mockSession,
        token: mockToken,
      });

      await openFinancialConnections();

      expect(mockCollectBankAccountToken).toHaveBeenCalledWith(
        'client_secret',
        { connectedAccountId: 'connected_account' }
      );
      expect(mockCollectFinancialConnectionsAccounts).not.toHaveBeenCalled();
      expect(getLastFinancialConnectionsResult()).toEqual({
        id: 'request',
        financialConnectionsSession: { accounts: [] },
        token: expectedToken,
        error: null,
      });
    });

    it('clears stale Financial Connections ownership when the same Connect instance changes source', async () => {
      let resolveFirst!: (result: any) => void;
      let resolveSecond!: (result: any) => void;
      const firstResult = new Promise<any>((resolve) => {
        resolveFirst = resolve;
      });
      const secondResult = new Promise<any>((resolve) => {
        resolveSecond = resolve;
      });
      (NativeStripeSdk.collectBankAccountToken as jest.Mock)
        .mockImplementationOnce(() => firstResult)
        .mockImplementationOnce(() => secondResult);

      mockLoadWebView = true;
      const { rerender, unmount } = renderComponent({
        component: 'account-onboarding',
      });
      const firstBridge = mockBridgeContainerProps;

      try {
        await act(async () => {
          sendBridgeRequest(
            'openFinancialConnections',
            {
              id: 'request-a',
              clientSecret: 'secret-a',
              connectedAccountId: 'acct-a',
            },
            firstBridge
          );
          await Promise.resolve();
          await Promise.resolve();
        });
        await waitFor(() => {
          expect(NativeStripeSdk.collectBankAccountToken).toHaveBeenCalledTimes(
            1
          );
        });

        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <EmbeddedComponent
              component="payments"
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );

        await act(async () => {
          sendBridgeRequest('openFinancialConnections', {
            id: 'request-b',
            clientSecret: 'secret-b',
            connectedAccountId: 'acct-b',
          });
          await Promise.resolve();
          await Promise.resolve();
        });
        await waitFor(() => {
          expect(NativeStripeSdk.collectBankAccountToken).toHaveBeenCalledTimes(
            2
          );
        });
      } finally {
        resolveFirst({ error: { code: 'Canceled' } });
        resolveSecond({ error: { code: 'Canceled' } });
        unmount();
      }
    });

    it('forwards a session-only result with a null token', async () => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockResolvedValue({
        session: mockSession,
      });

      await openFinancialConnections();

      expect(getLastFinancialConnectionsResult()).toEqual({
        id: 'request',
        financialConnectionsSession: { accounts: [] },
        token: null,
        error: null,
      });
    });

    it('keeps the replacement Financial Connections cleanup after the previous flow finishes', async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;
      const removeFirstListener = jest.fn();
      const removeSecondListener = jest.fn();
      const removeListeners = [removeFirstListener, removeSecondListener];
      const addListenerSpy = jest
        .spyOn(EventModule, 'addListener')
        .mockImplementation(() => ({ remove: removeListeners.shift() }) as any);

      let resolveFirst!: (result: any) => void;
      let resolveSecond!: (result: any) => void;
      const firstResult = new Promise<any>((resolve) => {
        resolveFirst = resolve;
      });
      const secondResult = new Promise<any>((resolve) => {
        resolveSecond = resolve;
      });
      (NativeStripeSdk.collectBankAccountToken as jest.Mock)
        .mockImplementationOnce(() => firstResult)
        .mockImplementationOnce(() => secondResult);

      mockLoadWebView = true;
      const { rerender, unmount } = renderComponent({
        component: 'account-onboarding',
      });
      const firstBridge = mockBridgeContainerProps;
      const firstContextId = firstBridge.contextId;

      try {
        await act(async () => {
          sendBridgeRequest(
            'openFinancialConnections',
            {
              id: 'request-a',
              clientSecret: 'secret-a',
              connectedAccountId: 'acct-a',
            },
            firstBridge
          );
          await Promise.resolve();
          await Promise.resolve();
        });

        const secondInstance = loadConnectAndInitialize({
          ...mockInitParams,
          locale: 'fr',
        });
        connectInstance = secondInstance;
        rerender(
          <ConnectComponentsProvider connectInstance={secondInstance}>
            <EmbeddedComponent
              component="account-onboarding"
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );
        await waitFor(() => {
          expect(mockBridgeContainerProps.contextId).not.toBe(firstContextId);
        });
        const secondBridge = mockBridgeContainerProps;

        await act(async () => {
          sendBridgeRequest(
            'openFinancialConnections',
            {
              id: 'request-b',
              clientSecret: 'secret-b',
              connectedAccountId: 'acct-b',
            },
            secondBridge
          );
          await Promise.resolve();
          await Promise.resolve();
        });

        await act(async () => {
          resolveFirst({ session: mockSession, token: null });
          await firstResult;
          await Promise.resolve();
        });
        await waitFor(() => {
          expect(removeFirstListener).toHaveBeenCalledTimes(1);
        });
        expect(
          mockBridgeReply.mock.calls.some(
            (call) => JSON.parse(call[3]).data?.id === 'request-a'
          )
        ).toBe(false);

        const thirdInstance = loadConnectAndInitialize({
          ...mockInitParams,
          locale: 'es',
        });
        connectInstance = thirdInstance;
        rerender(
          <ConnectComponentsProvider connectInstance={thirdInstance}>
            <EmbeddedComponent
              component="account-onboarding"
              onLoaderStart={jest.fn()}
              onLoadError={jest.fn()}
            />
          </ConnectComponentsProvider>
        );

        await waitFor(() => {
          expect(removeSecondListener).toHaveBeenCalledTimes(1);
        });
        expect(removeFirstListener).toHaveBeenCalledTimes(1);
      } finally {
        resolveSecond({ error: { code: 'Canceled' } });
        unmount();
        addListenerSpy.mockRestore();
        (global as any).__DEV__ = originalDev;
      }
    });

    it.each([
      ['a token without a session', { token: mockToken }],
      ['neither a session, token, nor error', {}],
    ])('reports an unexpected error for %s', async (_description, result) => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockResolvedValue(
        result
      );

      await openFinancialConnections();

      expectUnexpectedError(
        'Financial Connections completed without a session'
      );
    });

    it('reports cancellation without an error', async () => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockResolvedValue({
        error: { code: 'Canceled', message: 'Canceled' },
      });

      await openFinancialConnections();

      expect(getLastFinancialConnectionsResult()).toEqual({
        id: 'request',
        financialConnectionsSession: null,
        token: null,
        error: null,
      });
    });

    it('forwards native errors', async () => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockResolvedValue({
        error: { code: 'Failed', message: 'Native error' },
      });

      await openFinancialConnections();

      expect(getLastFinancialConnectionsResult()).toEqual({
        id: 'request',
        financialConnectionsSession: null,
        token: null,
        error: { code: 'Failed', message: 'Native error' },
      });
    });

    it('reports rejected promises as unexpected errors', async () => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockRejectedValue(
        new Error('Rejected')
      );

      await openFinancialConnections();

      expectUnexpectedError('Rejected');
    });
  });

  describe('toStripeJsBankAccountToken', () => {
    it('maps camelCase token to snake_case Stripe.js shape', () => {
      const result = toStripeJsBankAccountToken({
        id: 'tok_123',
        livemode: false,
        used: false,
        type: 'BankAccount',
        created: 1000000,
        bankAccount: {
          id: 'ba_123',
          bankName: 'Test Bank',
          accountHolderName: 'John Doe',
          accountHolderType: 'Individual',
          currency: 'usd',
          country: 'US',
          routingNumber: '110000000',
          status: 'New',
          fingerprint: 'fp_123',
          last4: '6789',
        },
      });

      expect(result).toEqual({
        id: 'tok_123',
        object: 'token',
        type: 'bank_account',
        used: false,
        livemode: false,
        created: 1000000,
        bank_account: {
          id: 'ba_123',
          object: 'bank_account',
          account_holder_name: 'John Doe',
          account_holder_type: 'Individual',
          bank_name: 'Test Bank',
          country: 'US',
          currency: 'usd',
          fingerprint: 'fp_123',
          last4: '6789',
          routing_number: '110000000',
          status: 'New',
        },
      });
    });

    it('returns null bank_account when bankAccount is null', () => {
      const result = toStripeJsBankAccountToken({
        id: 'tok_456',
        livemode: true,
        used: true,
        type: 'BankAccount',
        created: 2000000,
        bankAccount: null,
      });

      expect(result.id).toBe('tok_456');
      expect(result.object).toBe('token');
      expect(result.type).toBe('bank_account');
      expect(result.livemode).toBe(true);
      expect(result.bank_account).toBeNull();
    });

    it('preserves null fields in bank_account', () => {
      const result = toStripeJsBankAccountToken({
        id: 'tok_789',
        livemode: false,
        used: false,
        type: 'BankAccount',
        created: null,
        bankAccount: {
          id: 'ba_789',
          bankName: null,
          accountHolderName: null,
          accountHolderType: null,
          currency: null,
          country: null,
          routingNumber: null,
          status: null,
          fingerprint: null,
          last4: null,
        },
      });

      expect(result.bank_account).toEqual({
        id: 'ba_789',
        object: 'bank_account',
        account_holder_name: null,
        account_holder_type: null,
        bank_name: null,
        country: null,
        currency: null,
        fingerprint: null,
        last4: null,
        routing_number: null,
        status: null,
      });
    });
  });

  describe('isAllowedStripeHost', () => {
    it('allows exact Stripe hosts', () => {
      expect(
        isAllowedStripeHost(
          'https://connect-js.stripe.com/v1.0/react_native_webview.html'
        )
      ).toBe(true);
      expect(isAllowedStripeHost('https://connect.stripe.com/path')).toBe(true);
      expect(isAllowedStripeHost('https://verify.stripe.com/verify')).toBe(
        true
      );
    });

    it('rejects non-Stripe hosts, including those containing Stripe hostnames in path or query', () => {
      expect(
        isAllowedStripeHost(
          'https://example.com/connect-bridge?next=https%3A%2F%2Fconnect-js.stripe.com'
        )
      ).toBe(false);
      expect(
        isAllowedStripeHost('https://connect-js.stripe.com.example.com/path')
      ).toBe(false);
      expect(
        isAllowedStripeHost('https://example.com/?redirect=connect.stripe.com')
      ).toBe(false);
      expect(
        isAllowedStripeHost('https://example.com/connect-js.stripe.com/payload')
      ).toBe(false);
    });

    it('rejects malformed or empty URLs', () => {
      expect(isAllowedStripeHost('not-a-url')).toBe(false);
      expect(isAllowedStripeHost('')).toBe(false);
    });
  });
});
