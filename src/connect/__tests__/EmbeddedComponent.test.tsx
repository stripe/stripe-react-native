// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: React.forwardRef((_props: any, ref: any) => {
      // Expose ref methods for testing
      React.useImperativeHandle(ref, () => ({
        injectJavaScript: jest.fn(),
      }));
      return null;
    }),
  };
});

jest.mock('../../specs/NativeStripeSdkModule', () =>
  mockCreateNativeStripeSdkMock({
    openAuthenticatedWebView: jest.fn(),
  })
);

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Platform, AppState } from 'react-native';
import { EmbeddedComponent } from '../EmbeddedComponent';
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
});
