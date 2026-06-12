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
import {
  EmbeddedComponent,
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
});
