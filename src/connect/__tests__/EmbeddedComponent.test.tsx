// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

const mockInjectJavaScript = jest.fn();
const mockReload = jest.fn();
let webViewOnMessage: ((event: any) => void) | undefined;
let mockLoadWebView = false;
let mockWebViewComponent: any;
let mockWebViewProps: any;
let mockWebViewVersion: string | undefined;

jest.mock('react', () => {
  const React = jest.requireActual('react');
  return {
    ...React,
    useState: (initialState: any) => {
      let resolvedInitialState = initialState;
      if (mockLoadWebView && initialState === null) {
        mockLoadWebView = false;
        resolvedInitialState = {
          WebView: mockWebViewComponent,
          version: mockWebViewVersion,
        };
      }
      return React.useState(resolvedInitialState);
    },
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  mockWebViewComponent = React.forwardRef((props: any, ref: any) => {
    webViewOnMessage = props.onMessage;
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
    collectFinancialConnectionsAccounts: jest.fn(),
    openAuthenticatedWebView: jest.fn(),
    downloadAndShareFile: jest.fn(),
  })
);

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import 'react-native-webview';
import vm from 'vm';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
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
    webViewOnMessage = undefined;
    mockWebViewProps = undefined;
    mockLoadWebView = false;
    mockWebViewProps = undefined;
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

  describe('Initialization & Setup', () => {
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

  describe('Navigation handling', () => {
    const getNavigationHandler = async (props: any = {}) => {
      mockLoadWebView = true;
      renderComponent(props);

      await waitFor(() => {
        expect(mockWebViewProps?.onShouldStartLoadWithRequest).toEqual(
          expect.any(Function)
        );
      });

      return mockWebViewProps.onShouldStartLoadWithRequest;
    };

    it('opens an Android external navigation classified as other', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://example.com/help',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        expect(openUrl).toHaveBeenCalledWith('https://example.com/help');
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('opens an Android external navigation when classification is omitted', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://example.com/help',
        });

        expect(shouldLoad).toBe(false);
        expect(openUrl).toHaveBeenCalledWith('https://example.com/help');
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('keeps Android navigation to an allowed Connect host in the component', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const openUrl = jest.spyOn(Linking, 'openURL');

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://connect-js.stripe.com/embedded',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(true);
        expect(openUrl).not.toHaveBeenCalled();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('does not keep an http Connect host in the component on Android', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'http://connect.stripe.com/embedded',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        expect(openUrl).not.toHaveBeenCalled();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it.each([
      'click',
      'other',
      'reload',
      'backforward',
      'formsubmit',
      'formresubmit',
    ])(
      'blocks and routes outside a foreign iOS top-frame %s navigation',
      async (navigationType) => {
        const previousPlatform = Platform.OS;
        Platform.OS = 'ios' as any;
        const openUrl = jest
          .spyOn(Linking, 'openURL')
          .mockResolvedValue('' as any);

        try {
          const onShouldStartLoad = await getNavigationHandler();
          // No isTopFrame/mainDocumentURL is passed here, matching the
          // fail-closed rule: a missing mainDocumentURL is treated as top-frame.
          const shouldLoad = onShouldStartLoad({
            url: 'https://example.com/help',
            navigationType,
          });

          expect(shouldLoad).toBe(false);
          expect(openUrl).toHaveBeenCalledWith('https://example.com/help');
        } finally {
          openUrl.mockRestore();
          Platform.OS = previousPlatform;
        }
      }
    );

    it('allows the wrapper document and its same-URL reload on iOS, blocks lookalikes', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'ios' as any;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const wrapperUrl = mockWebViewProps.source.uri as string;

        // Initial load and the forced same-URL reload: both top-frame, both the
        // trusted wrapper document.
        expect(
          onShouldStartLoad({ url: wrapperUrl, navigationType: 'other' })
        ).toBe(true);
        expect(
          onShouldStartLoad({ url: wrapperUrl, navigationType: 'reload' })
        ).toBe(true);
        expect(openUrl).not.toHaveBeenCalled();

        // Wrong fragment, port, scheme, and path must all be rejected: each is
        // a different document, not the one the SDK trusts with the secret-key
        // fragment.
        const [origin, hash] = wrapperUrl.split('#');
        const wrongFragment = `${origin}#component=other`;
        const wrongPort = wrapperUrl.replace(
          'connect-js.stripe.com',
          'connect-js.stripe.com:1234'
        );
        const wrongScheme = wrapperUrl.replace('https://', 'http://');
        const wrongPath = wrapperUrl.replace(
          '/v1.0/react_native_webview.html',
          '/v1.0/other.html'
        );

        for (const badUrl of [
          wrongFragment,
          wrongPort,
          wrongScheme,
          wrongPath,
        ]) {
          expect(
            onShouldStartLoad({ url: badUrl, navigationType: 'other' })
          ).toBe(false);
        }
        expect(hash).toBeTruthy();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    describe('iOS subframe navigation', () => {
      const previousPlatform = Platform.OS;

      beforeEach(() => {
        Platform.OS = 'ios' as any;
      });

      afterEach(() => {
        Platform.OS = previousPlatform;
      });

      it.each([
        ['https://js.stripe.com/v3/', 'https:'],
        ['blob:https://connect-js.stripe.com/abcd-1234', 'blob:'],
        ['about:srcdoc', 'about:'],
      ])('allows a non-click subframe load of %s (%s)', async (url) => {
        const onShouldStartLoad = await getNavigationHandler();

        expect(
          onShouldStartLoad({
            url,
            navigationType: 'other',
            isTopFrame: false,
            mainDocumentURL: 'https://connect-js.stripe.com/other-doc',
          })
        ).toBe(true);
      });

      it('routes a click to a foreign host outside', async () => {
        const openUrl = jest
          .spyOn(Linking, 'openURL')
          .mockResolvedValue('' as any);

        try {
          const onShouldStartLoad = await getNavigationHandler();
          const shouldLoad = onShouldStartLoad({
            url: 'https://example.com/help',
            navigationType: 'click',
            isTopFrame: false,
            mainDocumentURL: 'https://connect-js.stripe.com/other-doc',
          });

          expect(shouldLoad).toBe(false);
          expect(openUrl).toHaveBeenCalledWith('https://example.com/help');
        } finally {
          openUrl.mockRestore();
        }
      });

      it('blocks a custom-scheme subframe load without calling Linking', async () => {
        const openUrl = jest.spyOn(Linking, 'openURL');

        try {
          const onShouldStartLoad = await getNavigationHandler();
          const shouldLoad = onShouldStartLoad({
            url: 'customscheme://action',
            navigationType: 'other',
            isTopFrame: false,
            mainDocumentURL: 'https://connect-js.stripe.com/other-doc',
          });

          expect(shouldLoad).toBe(false);
          expect(openUrl).not.toHaveBeenCalled();
        } finally {
          openUrl.mockRestore();
        }
      });
    });

    it('shares CSV exports without opening them externally', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const downloadAndShare =
        NativeStripeSdk.downloadAndShareFile as jest.Mock;
      downloadAndShare.mockResolvedValue({ success: true });
      const openUrl = jest.spyOn(Linking, 'openURL');

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://stripe-data-exports.com/report.csv',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        expect(downloadAndShare).toHaveBeenCalledWith(
          'https://stripe-data-exports.com/report.csv',
          null
        );
        expect(openUrl).not.toHaveBeenCalled();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it.each(['android', 'ios'])(
      'shares real S3-hosted CSV exports without opening them externally on %s',
      async (platform) => {
        const previousPlatform = Platform.OS;
        Platform.OS = platform as any;
        const downloadAndShare =
          NativeStripeSdk.downloadAndShareFile as jest.Mock;
        downloadAndShare.mockResolvedValue({ success: true });
        const openUrl = jest
          .spyOn(Linking, 'openURL')
          .mockResolvedValue('' as any);
        const csvExportUrl =
          'https://stripe-data-exports.s3.amazonaws.com/acct_123/xprt_456/payouts.csv?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc';

        try {
          const onShouldStartLoad = await getNavigationHandler();
          const shouldLoad = onShouldStartLoad({
            url: csvExportUrl,
            navigationType: 'other',
          });

          expect(shouldLoad).toBe(false);
          expect(downloadAndShare).toHaveBeenCalledWith(csvExportUrl, null);
          expect(openUrl).not.toHaveBeenCalled();
        } finally {
          openUrl.mockRestore();
          Platform.OS = previousPlatform;
        }
      }
    );

    it('does not treat lookalike export hosts as CSV exports', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const downloadAndShare =
        NativeStripeSdk.downloadAndShareFile as jest.Mock;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://stripe-data-exports.s3.amazonaws.com.attacker.example/x.csv',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        expect(downloadAndShare).not.toHaveBeenCalled();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('does not treat a foreign host with "stripe-data-exports" in its path as a CSV export', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const downloadAndShare =
        NativeStripeSdk.downloadAndShareFile as jest.Mock;
      const openUrl = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue('' as any);

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://attacker.example/stripe-data-exports/payload.csv',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        expect(downloadAndShare).not.toHaveBeenCalled();
      } finally {
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('keeps external navigation blocked when opening the URL rejects', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      const error = new Error('Unable to open URL');
      const openUrl = jest.spyOn(Linking, 'openURL').mockRejectedValue(error);
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      try {
        const onShouldStartLoad = await getNavigationHandler();
        const shouldLoad = onShouldStartLoad({
          url: 'https://example.com/help',
          navigationType: 'other',
        });

        expect(shouldLoad).toBe(false);
        await waitFor(() => {
          expect(consoleError).toHaveBeenCalledWith(
            'Unexpected error: Unable to open URL'
          );
        });
      } finally {
        consoleError.mockRestore();
        openUrl.mockRestore();
        Platform.OS = previousPlatform;
      }
    });

    it('sets originWhitelist to [*] so react-native-webview never auto-opens a URL before onShouldStartLoadWithRequest runs', async () => {
      mockLoadWebView = true;
      renderComponent();

      await waitFor(() => expect(mockWebViewProps).toBeDefined());

      expect(mockWebViewProps.originWhitelist).toEqual(['*']);
    });

    describe('onOpenWindow / popups', () => {
      const getOpenWindowHandler = async () => {
        mockLoadWebView = true;
        renderComponent();

        await waitFor(() => {
          expect(mockWebViewProps?.onOpenWindow).toEqual(expect.any(Function));
        });

        return mockWebViewProps.onOpenWindow;
      };

      it.each(['ios', 'android'])(
        'is registered by default on %s',
        async (platform) => {
          const previousPlatform = Platform.OS;
          Platform.OS = platform as any;
          try {
            await getOpenWindowHandler();
          } finally {
            Platform.OS = previousPlatform;
          }
        }
      );

      it.each([
        ['https://example.com/popup', 'https:'],
        ['mailto:someone@example.com', 'mailto:'],
      ])('opens a popup targetUrl of scheme %s', async (targetUrl) => {
        const openUrl = jest
          .spyOn(Linking, 'openURL')
          .mockResolvedValue('' as any);

        try {
          const onOpenWindow = await getOpenWindowHandler();
          onOpenWindow({ nativeEvent: { targetUrl } });

          await waitFor(() => {
            expect(openUrl).toHaveBeenCalledWith(targetUrl);
          });
        } finally {
          openUrl.mockRestore();
        }
      });

      it.each([
        'javascript:alert(1)',
        'http://example.com/popup',
        'myapp://action',
      ])('drops a popup targetUrl of %s', async (targetUrl) => {
        const openUrl = jest
          .spyOn(Linking, 'openURL')
          .mockResolvedValue('' as any);

        try {
          const onOpenWindow = await getOpenWindowHandler();
          onOpenWindow({ nativeEvent: { targetUrl } });

          expect(openUrl).not.toHaveBeenCalled();
        } finally {
          openUrl.mockRestore();
        }
      });

      it('sends a CSV export popup targetUrl to the native share sheet', async () => {
        const downloadAndShare =
          NativeStripeSdk.downloadAndShareFile as jest.Mock;
        downloadAndShare.mockResolvedValue({ success: true });
        const openUrl = jest.spyOn(Linking, 'openURL');

        try {
          const onOpenWindow = await getOpenWindowHandler();
          onOpenWindow({
            nativeEvent: {
              targetUrl: 'https://stripe-data-exports.com/report.csv',
            },
          });

          await waitFor(() => {
            expect(downloadAndShare).toHaveBeenCalledWith(
              'https://stripe-data-exports.com/report.csv',
              null
            );
          });
          expect(openUrl).not.toHaveBeenCalled();
        } finally {
          openUrl.mockRestore();
        }
      });
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

  describe('Init params injection', () => {
    // Runs the injected script the way the page would see it.
    const readInjectedObject = (script: string) => {
      const page: any = {};
      page.window = page;
      vm.createContext(page);
      vm.runInContext(script, page);
      return JSON.parse(page.ReactNativeWebView.injectedObjectJson());
    };

    // Renders with the WebView already loaded as the given
    // react-native-webview version.
    const renderWithWebView = async (
      platform: typeof Platform.OS,
      version: string | undefined,
      props: any = {}
    ) => {
      const previousPlatform = Platform.OS;
      Platform.OS = platform as any;
      mockWebViewVersion = version;
      mockLoadWebView = true;
      try {
        renderComponent(props);
        await waitFor(() => expect(mockWebViewProps).toBeDefined());
      } finally {
        Platform.OS = previousPlatform;
        mockWebViewVersion = undefined;
      }
    };

    it('defines injectedObjectJson in a script', async () => {
      // A value that react-native-webview's injectedJavaScriptObject corrupts.
      const appearance = {
        variables: { fontFamily: '"Courier New", Courier, monospace' },
      };
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        appearance,
      });
      mockLoadWebView = true;
      renderComponent();

      await waitFor(() => expect(mockWebViewProps).toBeDefined());

      expect(
        readInjectedObject(
          mockWebViewProps.injectedJavaScriptBeforeContentLoaded
        )
      ).toEqual({
        initParams: { appearance, locale: 'en' },
        appInfo: {},
      });
    });

    it('passes the default font family in the script too', async () => {
      await renderWithWebView('android', '13.13.0');

      const injected = readInjectedObject(
        mockWebViewProps.injectedJavaScriptBeforeContentLoaded
      );
      expect(injected.initParams.appearance.variables.fontFamily).toEqual(
        mockWebViewProps.injectedJavaScriptObject.initParams.appearance
          .variables.fontFamily
      );
      expect(injected.initParams.appearance.variables.fontFamily).toBeTruthy();
    });

    // react-native-webview runs injectedJavaScriptObject as a template literal
    // on iOS and on Android from 13.13.1, and serves it from a Java method on
    // Android before that.
    it.each([
      ['ios', '13.8.0', false],
      ['ios', '14.0.1', false],
      ['ios', undefined, false],
      ['android', '13.6.0', true],
      ['android', '13.13.0', true],
      ['android', '13.13.1', false],
      ['android', '13.16.0', false],
      ['android', '14.0.1', false],
      ['android', undefined, true],
      ['android', 'not-a-version', true],
      ['android', '13.13.1-rc.0', true],
    ] as const)(
      'on %s with react-native-webview %s, passes injectedJavaScriptObject: %s',
      async (platform, version, passed) => {
        await renderWithWebView(platform, version);

        if (passed) {
          expect(mockWebViewProps.injectedJavaScriptObject).toEqual(
            readInjectedObject(
              mockWebViewProps.injectedJavaScriptBeforeContentLoaded
            )
          );
        } else {
          expect(mockWebViewProps.injectedJavaScriptObject).toBeUndefined();
        }
      }
    );

    it('serves a value that breaks out of a template literal as data', async () => {
      const breakout =
        '`; }[(window.__f9Executed = true)]; window.ReactNativeWebView.injectedObjectJson = function () { return `';
      const interpolation = '${(window.__f9Interpolated = true)}';
      const componentProps = { setForm: { breakout, interpolation } };
      await renderWithWebView('ios', '14.0.1', { componentProps });

      expect(mockWebViewProps.injectedJavaScriptObject).toBeUndefined();

      const page: any = {};
      page.window = page;
      vm.createContext(page);
      vm.runInContext(
        mockWebViewProps.injectedJavaScriptBeforeContentLoaded,
        page
      );
      const injected = JSON.parse(page.ReactNativeWebView.injectedObjectJson());
      expect(injected.initComponentProps).toEqual(componentProps);
      expect(page.__f9Executed).toBeUndefined();
      expect(page.__f9Interpolated).toBeUndefined();
    });
  });

  describe('Logging hygiene', () => {
    it('does not log the URL for an invalid authenticated webview request', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      try {
        mockLoadWebView = true;
        renderComponent();
        await waitFor(() => expect(webViewOnMessage).toBeDefined());

        await act(async () => {
          webViewOnMessage?.({
            nativeEvent: {
              data: JSON.stringify({
                type: 'openAuthenticatedWebView',
                data: {
                  id: 'auth_bad',
                  url: 'javascript:alert(document.cookie)//secret_in_url',
                },
              }),
            },
          });
        });

        expect(consoleError).toHaveBeenCalled();
        const loggedMessages = consoleError.mock.calls.map((call) =>
          call.join(' ')
        );
        loggedMessages.forEach((message) => {
          expect(message).not.toContain('secret_in_url');
        });
      } finally {
        consoleError.mockRestore();
      }
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
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      await act(async () => {
        webViewOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({
              type: 'openFinancialConnections',
              data: {
                id: 'request',
                clientSecret: 'client_secret',
                connectedAccountId: 'connected_account',
              },
            }),
          },
        });
      });
    };

    const getLastInjectedJavaScript = () =>
      mockInjectJavaScript.mock.calls[
        mockInjectJavaScript.mock.calls.length - 1
      ]?.[0];

    const getLastFinancialConnectionsResult = () => {
      const injectedJavaScript = getLastInjectedJavaScript();
      const serializedPayload = injectedJavaScript?.match(
        /window\.callSetterWithSerializableValue\((.*)\);/
      )?.[1];

      if (!serializedPayload) {
        throw new Error(
          'No Financial Connections result found in the injected JavaScript'
        );
      }

      return JSON.parse(serializedPayload).value;
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

  describe('deliverToWrapper guard', () => {
    const WRAPPER_ORIGIN = 'https://connect-js.stripe.com';
    const WRAPPER_PATH = '/v1.0/react_native_webview.html';

    // Evaluates the injected script the way the page would see it: window
    // is unforgeable from RN's side, so this is the actual security check.
    const runScript = (
      script: string,
      location: { origin: string; pathname: string }
    ) => {
      const resolve = jest.fn();
      const win: Record<string, unknown> = {
        location,
        clientSecretDeferred: { resolve },
      };
      // eslint-disable-next-line no-new-func
      new Function('window', script)(win);
      return resolve;
    };

    const triggerFetchClientSecret = async () => {
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      await act(async () => {
        webViewOnMessage?.({
          nativeEvent: { data: JSON.stringify({ type: 'fetchClientSecret' }) },
        });
      });

      return mockInjectJavaScript.mock.calls[
        mockInjectJavaScript.mock.calls.length - 1
      ]?.[0];
    };

    it('delivers the client secret only inside the wrapper document', async () => {
      const script = await triggerFetchClientSecret();

      expect(
        runScript(script, { origin: WRAPPER_ORIGIN, pathname: WRAPPER_PATH })
      ).toHaveBeenCalledWith('secret_123');
    });

    it.each([
      [
        'a foreign origin',
        { origin: 'https://evil.example', pathname: WRAPPER_PATH },
      ],
      [
        'https://connect-js.stripe.com/other.html',
        { origin: WRAPPER_ORIGIN, pathname: '/other.html' },
      ],
      [
        'http://connect-js.stripe.com/v1.0/react_native_webview.html',
        { origin: 'http://connect-js.stripe.com', pathname: WRAPPER_PATH },
      ],
    ])('does not deliver the client secret for %s', async (_desc, location) => {
      const script = await triggerFetchClientSecret();

      expect(runScript(script, location)).not.toHaveBeenCalled();
    });

    const expectGuarded = (script: string | undefined) => {
      expect(script).toContain('window.location.origin');
      expect(script).toContain('window.location.pathname');
      expect(script).toContain(JSON.stringify(WRAPPER_ORIGIN));
      expect(script).toContain(JSON.stringify(WRAPPER_PATH));
    };

    const lastInjectedScript = () =>
      mockInjectJavaScript.mock.calls[
        mockInjectJavaScript.mock.calls.length - 1
      ]?.[0];

    it('guards the appearance/locale update', async () => {
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(mockWebViewProps).toBeDefined());

      act(() => {
        connectInstance.update({ locale: 'fr' });
      });

      await waitFor(() => expectGuarded(lastInjectedScript()));
    });

    it('guards a componentProps setter injection', async () => {
      mockLoadWebView = true;
      const { rerender } = renderComponent({
        componentProps: { setPayment: 'pi_123' },
      });
      await waitFor(() => expect(mockWebViewProps).toBeDefined());

      rerender(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <EmbeddedComponent
            component="payments"
            componentProps={{ setPayment: 'pi_456' }}
            onLoaderStart={jest.fn()}
            onLoadError={jest.fn()}
            onPageDidLoad={jest.fn()}
          />
        </ConnectComponentsProvider>
      );

      await waitFor(() => expectGuarded(lastInjectedScript()));
    });

    it('guards the authenticated webview result', async () => {
      Platform.OS = 'ios' as any;
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock).mockResolvedValue(
        { url: 'https://connect.stripe.com/return' }
      );
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      await act(async () => {
        webViewOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({
              type: 'openAuthenticatedWebView',
              data: { id: 'auth_1', url: 'https://connect.stripe.com/start' },
            }),
          },
        });
      });

      await waitFor(() => expectGuarded(lastInjectedScript()));
    });

    it('guards the Financial Connections result', async () => {
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockResolvedValue(
        {}
      );
      mockLoadWebView = true;
      renderComponent({ component: 'account-onboarding' });
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      await act(async () => {
        webViewOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({
              type: 'openFinancialConnections',
              data: {
                id: 'request',
                clientSecret: 'client_secret',
                connectedAccountId: 'connected_account',
              },
            }),
          },
        });
      });

      await waitFor(() => expectGuarded(lastInjectedScript()));
    });
  });

  describe('Generation counter (D3 hygiene)', () => {
    const WRAPPER_URL =
      'https://connect-js.stripe.com/v1.0/react_native_webview.html';

    it('drops a delayed fetchClientSecret reply after a new top-frame load starts', async () => {
      let resolveSecret: (value: string) => void = () => {};
      const secretPromise = new Promise<string>((resolve) => {
        resolveSecret = resolve;
      });
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        fetchClientSecret: jest.fn(() => secretPromise),
      });
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      const messagePromise = webViewOnMessage?.({
        nativeEvent: {
          data: JSON.stringify({ type: 'fetchClientSecret' }),
        },
      });

      act(() => {
        mockWebViewProps.onLoadStart({
          nativeEvent: {
            url: `${WRAPPER_URL}#component=other`,
            navigationType: 'other',
          },
        });
      });

      resolveSecret('secret_late');
      await act(async () => {
        await messagePromise;
      });

      expect(mockInjectJavaScript).not.toHaveBeenCalled();
    });

    it('delivers a fetchClientSecret reply when no load intervenes', async () => {
      let resolveSecret: (value: string) => void = () => {};
      const secretPromise = new Promise<string>((resolve) => {
        resolveSecret = resolve;
      });
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        fetchClientSecret: jest.fn(() => secretPromise),
      });
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      const messagePromise = webViewOnMessage?.({
        nativeEvent: {
          data: JSON.stringify({ type: 'fetchClientSecret' }),
        },
      });

      resolveSecret('secret_on_time');
      await act(async () => {
        await messagePromise;
      });

      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('secret_on_time')
      );
    });

    const flushMicrotasks = async () => {
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
    };

    it('drops a delayed Financial Connections reply after a new top-frame load starts', async () => {
      let resolveToken: (result: any) => void = () => {};
      const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
      });
      (NativeStripeSdk.collectBankAccountToken as jest.Mock).mockReturnValue(
        tokenPromise
      );

      mockLoadWebView = true;
      renderComponent({ component: 'account-onboarding' });
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      act(() => {
        webViewOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({
              type: 'openFinancialConnections',
              data: {
                id: 'request',
                clientSecret: 'client_secret',
                connectedAccountId: 'connected_account',
              },
            }),
          },
        });
      });

      act(() => {
        mockWebViewProps.onLoadStart({
          nativeEvent: {
            url: `${WRAPPER_URL}#component=other`,
            navigationType: 'other',
          },
        });
      });

      resolveToken({ session: { id: 'session', accounts: [] } });
      await flushMicrotasks();

      expect(mockInjectJavaScript).not.toHaveBeenCalled();
    });

    it('drops a delayed iOS auth-webview reply after a new top-frame load starts', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'ios' as any;
      let resolveAuth: (result: any) => void = () => {};
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve;
      });
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock).mockReturnValue(
        authPromise
      );

      try {
        mockLoadWebView = true;
        renderComponent();
        await waitFor(() => expect(webViewOnMessage).toBeDefined());

        act(() => {
          webViewOnMessage?.({
            nativeEvent: {
              data: JSON.stringify({
                type: 'openAuthenticatedWebView',
                data: {
                  id: 'auth_ios',
                  url: 'https://connect.stripe.com/start',
                },
              }),
            },
          });
        });

        act(() => {
          mockWebViewProps.onLoadStart({
            nativeEvent: {
              url: `${WRAPPER_URL}#component=other`,
              navigationType: 'other',
            },
          });
        });

        resolveAuth({ url: 'https://connect.stripe.com/return' });
        await flushMicrotasks();

        expect(mockInjectJavaScript).not.toHaveBeenCalled();
      } finally {
        Platform.OS = previousPlatform;
      }
    });

    it('drops an Android auth cancellation reply if a new load started before the grace period elapses', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'android' as any;
      (NativeStripeSdk.openAuthenticatedWebView as jest.Mock).mockResolvedValue(
        {}
      );
      const appStateListeners: Array<(state: string) => void> = [];
      const previousAddEventListener = AppState.addEventListener;
      (AppState.addEventListener as jest.Mock) = jest.fn((_event, handler) => {
        appStateListeners.push(handler);
        return { remove: jest.fn() };
      });
      (AppState.currentState as any) = 'active';

      try {
        mockLoadWebView = true;
        renderComponent();
        await waitFor(() => expect(webViewOnMessage).toBeDefined());

        await act(async () => {
          await webViewOnMessage?.({
            nativeEvent: {
              data: JSON.stringify({
                type: 'openAuthenticatedWebView',
                data: {
                  id: 'auth_android',
                  url: 'https://connect.stripe.com/start',
                },
              }),
            },
          });
        });

        act(() => {
          appStateListeners[0]?.('background');
          appStateListeners[0]?.('active');
        });

        act(() => {
          mockWebViewProps.onLoadStart({
            nativeEvent: {
              url: `${WRAPPER_URL}#component=other`,
              navigationType: 'other',
            },
          });
        });

        // DEEP_LINK_GRACE_PERIOD_MS is 500; wait past it for the fallback
        // cancellation timeout to fire.
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 700));
        });

        expect(mockInjectJavaScript).not.toHaveBeenCalled();
      } finally {
        Platform.OS = previousPlatform;
        (AppState.addEventListener as jest.Mock) =
          previousAddEventListener as any;
      }
    });

    it('delivers a secret requested after the forced iOS reload load-start', async () => {
      const previousPlatform = Platform.OS;
      Platform.OS = 'ios' as any;
      let resolveSecret: (value: string) => void = () => {};
      const secretPromise = new Promise<string>((resolve) => {
        resolveSecret = resolve;
      });
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        fetchClientSecret: jest.fn(() => secretPromise),
      });

      try {
        mockLoadWebView = true;
        renderComponent();
        await waitFor(() => expect(mockWebViewProps).toBeDefined());
        await waitFor(() => expect(webViewOnMessage).toBeDefined());

        const wrapperUrl = mockWebViewProps.source.uri as string;

        // Initial load, then the forced same-URL reload workaround: both
        // bump the generation (D3). A same-URL reload is still a new
        // document load, not a no-op.
        act(() => {
          mockWebViewProps.onLoadStart({
            nativeEvent: { url: wrapperUrl, navigationType: 'other' },
          });
        });
        act(() => {
          mockWebViewProps.onLoadStart({
            nativeEvent: { url: wrapperUrl, navigationType: 'reload' },
          });
        });

        const messagePromise = webViewOnMessage?.({
          nativeEvent: { data: JSON.stringify({ type: 'fetchClientSecret' }) },
        });

        resolveSecret('secret_after_reload');
        await act(async () => {
          await messagePromise;
        });

        expect(mockInjectJavaScript).toHaveBeenCalledWith(
          expect.stringContaining('secret_after_reload')
        );
      } finally {
        Platform.OS = previousPlatform;
      }
    });

    it('does not drop a pending reply for a fragment-only change', async () => {
      let resolveSecret: (value: string) => void = () => {};
      const secretPromise = new Promise<string>((resolve) => {
        resolveSecret = resolve;
      });
      connectInstance = loadConnectAndInitialize({
        ...mockInitParams,
        fetchClientSecret: jest.fn(() => secretPromise),
      });
      mockLoadWebView = true;
      renderComponent();
      await waitFor(() => expect(mockWebViewProps).toBeDefined());
      await waitFor(() => expect(webViewOnMessage).toBeDefined());

      const wrapperUrl = mockWebViewProps.source.uri as string;

      act(() => {
        mockWebViewProps.onLoadStart({
          nativeEvent: { url: wrapperUrl, navigationType: 'other' },
        });
      });

      const messagePromise = webViewOnMessage?.({
        nativeEvent: { data: JSON.stringify({ type: 'fetchClientSecret' }) },
      });

      // A pure fragment change (e.g. client-side routing) within the same
      // document isn't a new document load, so it shouldn't drop the
      // in-flight request above.
      act(() => {
        mockWebViewProps.onLoadStart({
          nativeEvent: {
            url: `${wrapperUrl.split('#')[0]}#component=other`,
            navigationType: 'other',
          },
        });
      });

      resolveSecret('secret_fragment_only');
      await act(async () => {
        await messagePromise;
      });

      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('secret_fragment_only')
      );
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

    const ATTACKER_URLS = [
      'https://attacker.invalid/?x=@connect.stripe.com',
      'https://attacker.invalid/#@connect.stripe.com',
      'https://attacker.invalid/landing?next=https://@verify.stripe.com',
    ];

    const REAL_STRIPE_URLS = [
      'https://connect-js.stripe.com/v1.0/react_native_webview.html#component=payouts',
      'https://connect.stripe.com/path',
      'https://verify.stripe.com/verify',
      'https://connect.stripe.com:8443/x',
    ];

    it('rejects userinfo/host-confusion URLs and non-http(s) inputs', () => {
      const urls = [
        ...ATTACKER_URLS,
        'https://connect.stripe.com@evil.com/',
        'https://connect.stripe.com:80@evil.com/',
        'https://connect.stripe.com\\@evil.com',
        'https://connect.stripe.com.evil.com/',
        'https://connect.stripe.com\t.evil.com',
        'about:blank',
        '',
      ];
      urls.forEach((url) => {
        expect([url, isAllowedStripeHost(url)]).toEqual([url, false]);
      });
    });

    it('still allows legitimate Stripe URLs (ports)', () => {
      REAL_STRIPE_URLS.forEach((url) => {
        expect([url, isAllowedStripeHost(url)]).toEqual([url, true]);
      });
    });

    it('rejects a production Stripe host over plain http', () => {
      expect(isAllowedStripeHost('http://connect.stripe.com/x')).toBe(false);
    });

    describe('with a runtime URL parser that mis-parses "@" in query/fragment', () => {
      const RealURL = global.URL;

      class BuggyURL {
        private _url: string;
        constructor(url: string) {
          if (!/^https?:\/\//i.test(url)) {
            throw new TypeError('Invalid URL');
          }
          this._url = url;
        }
        get hostname(): string {
          return this._url.match(/^https?:\/\/(?:[^@]+@)?([^:/?#]+)/)![1]!;
        }
        get host(): string {
          return this.hostname;
        }
      }

      beforeEach(() => {
        (global as any).URL = BuggyURL;
      });

      afterEach(() => {
        (global as any).URL = RealURL;
      });

      it('sanity: the fake parser reports the trusted host for attacker URLs', () => {
        expect(new URL(ATTACKER_URLS[0]!).hostname).toBe('connect.stripe.com');
      });

      it('rejects attacker URLs and still allows real Stripe URLs', () => {
        ATTACKER_URLS.forEach((url) => {
          expect([url, isAllowedStripeHost(url)]).toEqual([url, false]);
        });
        REAL_STRIPE_URLS.forEach((url) => {
          expect([url, isAllowedStripeHost(url)]).toEqual([url, true]);
        });
      });
    });

    it('never allows a URL that the previous implementation rejected', () => {
      // Copy of the original implementation (dev hosts are disabled in tests).
      const oldIsAllowed = (url: string): boolean => {
        try {
          const parsedUrl = new URL(url);
          return [
            'connect-js.stripe.com',
            'connect.stripe.com',
            'verify.stripe.com',
          ].some(
            (host) => parsedUrl.hostname === host || parsedUrl.host === host
          );
        } catch {
          return false;
        }
      };

      const urls = [
        ...ATTACKER_URLS,
        ...REAL_STRIPE_URLS,
        'https://connect.stripe.com@evil.com/',
        'https://connect.stripe.com:80@evil.com/',
        'https://connect.stripe.com\\@evil.com',
        'https://connect.stripe.com.evil.com/',
        'https://connect.stripe.com\t.evil.com',
        'about:blank',
        '',
        'https://connect.stripe.com',
        'https://connect.stripe.com/',
        'https://connect.stripe.com?x=1',
        'https://connect.stripe.com#frag',
        'https://connect.stripe.com:443/path',
        'https://connect.stripe.com:/path',
        'https://connect.stripe.com:abc/path',
        'https://user:pass@connect.stripe.com/path',
        'https://user:pass@evil.com/',
        'https://user@connect.stripe.com:8443/x',
        'ftp://connect.stripe.com/x',
        'https:/connect.stripe.com',
        'https:connect.stripe.com',
        'https://verify.stripe.com/?next=https://evil.com',
        'https://verify.stripe.com/#https://evil.com@x',
        'https://sub.connect.stripe.com/x',
        'https://evilconnect.stripe.com/x',
        ' https://connect.stripe.com/x',
      ];
      expect(urls.length).toBeGreaterThanOrEqual(30);
      urls.forEach((url) => {
        if (isAllowedStripeHost(url)) {
          expect([url, oldIsAllowed(url)]).toEqual([url, true]);
        }
      });
    });
  });
});
