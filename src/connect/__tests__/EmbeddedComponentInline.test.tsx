// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

let mockLoadWebView = false;
let mockWebViewComponent: any;
let mockWebViewProps: any;
let mockHostProps: any;
const mockSheetChanged = jest.fn();
const mockResetSheets = jest.fn();

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
      injectJavaScript: jest.fn(),
      reload: jest.fn(),
    }));
    return null;
  });
  return { WebView: mockWebViewComponent };
});

jest.mock('../../specs/NativeConnectInlineHost', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      mockHostProps = props;
      React.useImperativeHandle(ref, () => ({}));
      return props.children;
    }),
    Commands: {
      sheetChanged: (...args: any[]) => mockSheetChanged(...args),
      resetSheets: (...args: any[]) => mockResetSheets(...args),
    },
  };
});

jest.mock('../../specs/NativeStripeSdkModule', () =>
  mockCreateNativeStripeSdkMock()
);

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Platform, UIManager } from 'react-native';
import vm from 'vm';
import 'react-native-webview';
import { EmbeddedComponent } from '../EmbeddedComponent';
import {
  ConnectComponentsProvider,
  loadConnectAndInitialize,
} from '../ConnectComponentsProvider';

describe('EmbeddedComponent inline', () => {
  const originalFetch = global.fetch;
  let connectInstance: any;
  let hasViewManagerConfig: jest.SpyInstance;

  // Keeps component analytics events off the network.
  beforeAll(() => {
    global.fetch = jest.fn(async () => ({ ok: true })) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = undefined;
    mockHostProps = undefined;
    hasViewManagerConfig = jest
      .spyOn(UIManager, 'hasViewManagerConfig')
      .mockReturnValue(true);
    connectInstance = loadConnectAndInitialize({
      publishableKey: 'pk_test_123',
      fetchClientSecret: jest.fn(async () => 'secret_123'),
    });
  });

  afterEach(() => {
    hasViewManagerConfig.mockRestore();
  });

  const renderComponent = (props: any = {}) => {
    mockLoadWebView = true;
    return render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <EmbeddedComponent component="notification-banner" inline {...props} />
      </ConnectComponentsProvider>
    );
  };

  const renderAttached = async (props: any = {}) => {
    renderComponent(props);
    await waitFor(() => expect(mockHostProps).toBeDefined());
    await act(async () => {
      mockHostProps.onAttach({ nativeEvent: { attached: true } });
    });
  };

  // Sends a message the way the wrapper document's bridge does.
  const sendMessage = async (message: object) => {
    const posted: string[] = [];
    const page: any = {
      location: {
        origin: 'https://connect-js.stripe.com',
        pathname: '/v1.0/react_native_webview.html',
        href: mockWebViewProps.source.uri,
      },
      ReactNativeWebView: { postMessage: (data: string) => posted.push(data) },
    };
    page.window = page.top = page;
    vm.createContext(page);
    vm.runInContext(
      mockWebViewProps.injectedJavaScriptBeforeContentLoaded,
      page
    );
    page.ReactNativeWebView.postMessage(JSON.stringify(message));
    await act(async () => {
      await mockWebViewProps.onMessage({ nativeEvent: { data: posted[0] } });
    });
  };

  it('leaves other components as they were', async () => {
    mockLoadWebView = true;
    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <EmbeddedComponent component="payouts" />
      </ConnectComponentsProvider>
    );
    await waitFor(() => expect(mockWebViewProps).toBeDefined());

    await sendMessage({
      type: 'sheetChanged',
      data: { sheetId: 'sheet-1', height: 300 },
    });

    expect(mockHostProps).toBeUndefined();
    expect(mockWebViewProps.source.uri).toContain('#component=payouts');
    expect(mockWebViewProps).not.toHaveProperty(
      'javaScriptCanOpenWindowsAutomatically'
    );
    expect(mockSheetChanged).not.toHaveBeenCalled();
  });

  it('reports a load error right away when the native host is not registered', () => {
    hasViewManagerConfig.mockReturnValue(false);
    const onLoadError = jest.fn();

    renderComponent({ onLoadError });

    expect(onLoadError).toHaveBeenCalledWith({
      elementTagName: 'stripe-connect-notification-banner',
      error: {
        type: 'render_error',
        message:
          'Native sheets are unavailable, so this component cannot load inline.',
      },
    });
  });

  it('loads the component page only once the native host attaches', async () => {
    renderComponent();
    await waitFor(() => expect(mockHostProps).toBeDefined());
    expect(mockWebViewProps.source).toEqual({ html: '' });

    await act(async () => {
      mockHostProps.onAttach({ nativeEvent: { attached: true } });
    });

    expect(mockWebViewProps.source.uri).toContain(
      '#component=notification-banner'
    );
  });

  it('passes sheetChanged to the native host, dismissible unless it says otherwise', async () => {
    await renderAttached();

    await sendMessage({
      type: 'sheetChanged',
      data: { sheetId: 'sheet-1', height: 300 },
    });

    expect(mockSheetChanged).toHaveBeenCalledWith(
      expect.anything(),
      'sheet-1',
      300,
      true
    );
  });

  it('tears down sheets when the component page loads on Android', async () => {
    const previousPlatform = Platform.OS;
    Platform.OS = 'android' as any;

    try {
      await renderAttached();
      mockWebViewProps.onLoadStart();

      expect(mockResetSheets).toHaveBeenCalled();
    } finally {
      Platform.OS = previousPlatform;
    }
  });
});
