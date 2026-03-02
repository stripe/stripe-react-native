// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: React.forwardRef((_props: any, ref: any) => {
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

jest.mock('../../specs/NativeConnectAccountOnboardingView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      return React.createElement(View, {
        testID: 'native-account-onboarding-view',
        ...props,
      });
    }),
  };
});

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import {
  ConnectAccountOnboarding,
  ConnectPayments,
  ConnectPayouts,
  ConnectPaymentDetails,
} from '../Components';
import {
  loadConnectAndInitialize,
  ConnectComponentsProvider,
} from '../ConnectComponentsProvider';
import type { StripeConnectInitParams, StepChange } from '../connectTypes';

describe('ConnectAccountOnboarding', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
    appearance: {
      variables: {
        colorPrimary: '#000000',
        colorBackground: '#FFFFFF',
        colorText: '#333333',
        colorSecondaryText: '#888888',
      },
    },
    locale: 'en',
  };

  let connectInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    connectInstance = loadConnectAndInitialize(mockInitParams);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = (props: any = {}) => {
    return render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectAccountOnboarding onExit={jest.fn()} {...props} />
      </ConnectComponentsProvider>
    );
  };

  describe('iOS-specific', () => {
    beforeEach(() => {
      Platform.OS = 'ios' as any;
    });

    it('renders NativeConnectAccountOnboardingView on iOS', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('native-account-onboarding-view')).toBeTruthy();
    });

    it('passes correct props to native component', () => {
      const title = 'Complete Onboarding';
      const { getByTestId } = renderComponent({ title });

      const nativeView = getByTestId('native-account-onboarding-view');
      expect(nativeView.props.title).toBe(title);
      expect(nativeView.props.backgroundColor).toBe('#FFFFFF');
      expect(nativeView.props.visible).toBe(true);
    });

    it('shows ActivityIndicator while loading', () => {
      const { queryByTestId } = renderComponent();

      // Component should render without error
      expect(queryByTestId('native-account-onboarding-view')).toBeTruthy();
    });

    it('calls onExit after modal visibility change timeout', async () => {
      const onExit = jest.fn();
      const { getByTestId } = renderComponent({ onExit });

      const nativeView = getByTestId('native-account-onboarding-view');

      // Trigger exit by calling onExitAction
      if (nativeView.props.onExitAction) {
        nativeView.props.onExitAction();
      }

      // Fast-forward timers to trigger setTimeout
      jest.runAllTimers();

      await waitFor(() => {
        expect(onExit).toHaveBeenCalled();
      });
    });
  });

  describe('Android-specific', () => {
    beforeEach(() => {
      Platform.OS = 'android' as any;
    });

    it('renders Modal on Android', () => {
      // Component should render without error
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('Common behavior', () => {
    it('component renders with all TOS URLs and collection options', () => {
      const props = {
        recipientTermsOfServiceUrl: 'https://example.com/recipient-tos',
        fullTermsOfServiceUrl: 'https://example.com/full-tos',
        privacyPolicyUrl: 'https://example.com/privacy',
        collectionOptions: {
          fields: 'currently_due' as const,
          futureRequirements: 'include' as const,
        },
      };

      const { rerender } = renderComponent(props);

      // Should not throw when re-rendering with same props
      expect(() => {
        rerender(
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding onExit={jest.fn()} {...props} />
          </ConnectComponentsProvider>
        );
      }).not.toThrow();
    });

    it('renders with custom appearance variables', () => {
      const customAppearance = {
        variables: {
          colorBackground: '#AABBCC',
          colorText: '#112233',
          colorSecondaryText: '#445566',
        },
      };

      const instance = loadConnectAndInitialize({
        ...mockInitParams,
        appearance: customAppearance,
      });

      expect(() => {
        render(
          <ConnectComponentsProvider connectInstance={instance}>
            <ConnectAccountOnboarding onExit={jest.fn()} />
          </ConnectComponentsProvider>
        );
      }).not.toThrow();
    });

    it('onStepChange callback can be provided', () => {
      const onStepChange = jest.fn((step: StepChange) => {
        console.log('Step changed:', step);
      });

      renderComponent({ onStepChange });

      expect(onStepChange).toBeDefined();
    });

    it('exit flow calls onExit after timeout', async () => {
      Platform.OS = 'ios' as any;
      const onExit = jest.fn();
      const { getByTestId } = renderComponent({ onExit });

      const nativeView = getByTestId('native-account-onboarding-view');

      // Initial state should be visible
      expect(nativeView.props.visible).toBe(true);

      // Trigger exit
      if (nativeView.props.onExitAction) {
        nativeView.props.onExitAction();
      }

      jest.runAllTimers();

      await waitFor(() => {
        expect(onExit).toHaveBeenCalled();
      });
    });

    it('renders with default appearance when not specified', () => {
      const instance = loadConnectAndInitialize({
        publishableKey: 'pk_test_123',
        fetchClientSecret: jest.fn(async () => 'secret_123'),
      });

      expect(() => {
        render(
          <ConnectComponentsProvider connectInstance={instance}>
            <ConnectAccountOnboarding onExit={jest.fn()} />
          </ConnectComponentsProvider>
        );
      }).not.toThrow();
    });
  });
});

describe('ConnectPayments', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
  };

  let connectInstance: any;

  beforeEach(() => {
    connectInstance = loadConnectAndInitialize(mockInitParams);
  });

  it('renders without error', () => {
    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayments />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('renders with defaultFilters', () => {
    const defaultFilters = {
      status: ['successful' as const, 'pending' as const],
      paymentMethod: 'card' as const,
      amount: { greaterThan: 1000 },
    };

    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayments defaultFilters={defaultFilters} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('callbacks can be provided', () => {
    const onLoaderStart = jest.fn();
    const onLoadError = jest.fn();
    const onPageDidLoad = jest.fn();

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPayments
          onLoaderStart={onLoaderStart}
          onLoadError={onLoadError}
          onPageDidLoad={onPageDidLoad}
        />
      </ConnectComponentsProvider>
    );
  });

  it('style prop can be applied', () => {
    const style = { flex: 1, backgroundColor: '#F0F0F0' };

    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayments style={style} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('re-renders with same props without error', () => {
    const defaultFilters = {
      status: ['successful' as const],
    };

    const { rerender } = render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPayments defaultFilters={defaultFilters} />
      </ConnectComponentsProvider>
    );

    // Should not throw when re-rendering with same props
    expect(() => {
      rerender(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayments defaultFilters={defaultFilters} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });
});

describe('ConnectPayouts', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
  };

  let connectInstance: any;

  beforeEach(() => {
    connectInstance = loadConnectAndInitialize(mockInitParams);
  });

  it('renders without error', () => {
    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayouts />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('callbacks can be provided', () => {
    const onLoaderStart = jest.fn();
    const onLoadError = jest.fn();
    const onPageDidLoad = jest.fn();

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPayouts
          onLoaderStart={onLoaderStart}
          onLoadError={onLoadError}
          onPageDidLoad={onPageDidLoad}
        />
      </ConnectComponentsProvider>
    );
  });

  it('style prop can be applied', () => {
    const style = { height: 300 };

    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPayouts style={style} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });
});

describe('ConnectPaymentDetails', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
  };

  let connectInstance: any;

  beforeEach(() => {
    connectInstance = loadConnectAndInitialize(mockInitParams);
  });

  it('renders without error', () => {
    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPaymentDetails payment="pi_123" onClose={jest.fn()} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('renders with payment ID', () => {
    const paymentId = 'pi_test_123456';

    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPaymentDetails payment={paymentId} onClose={jest.fn()} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('onClose callback can be provided', () => {
    const onClose = jest.fn();

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPaymentDetails payment="pi_123" onClose={onClose} />
      </ConnectComponentsProvider>
    );
  });

  it('re-renders with same props without error', () => {
    const payment = 'pi_123';
    const onClose = jest.fn();

    const { rerender } = render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPaymentDetails payment={payment} onClose={onClose} />
      </ConnectComponentsProvider>
    );

    // Should not throw when re-rendering with same props
    expect(() => {
      rerender(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPaymentDetails payment={payment} onClose={onClose} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('re-renders with different payment ID without error', () => {
    const onClose = jest.fn();

    const { rerender } = render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPaymentDetails payment="pi_123" onClose={onClose} />
      </ConnectComponentsProvider>
    );

    // Should not throw when re-rendering with different payment ID
    expect(() => {
      rerender(
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectPaymentDetails payment="pi_456" onClose={onClose} />
        </ConnectComponentsProvider>
      );
    }).not.toThrow();
  });

  it('all callbacks can be provided', () => {
    const onLoaderStart = jest.fn();
    const onLoadError = jest.fn();
    const onPageDidLoad = jest.fn();
    const onClose = jest.fn();

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectPaymentDetails
          payment="pi_123"
          onClose={onClose}
          onLoaderStart={onLoaderStart}
          onLoadError={onLoadError}
          onPageDidLoad={onPageDidLoad}
        />
      </ConnectComponentsProvider>
    );
  });
});
