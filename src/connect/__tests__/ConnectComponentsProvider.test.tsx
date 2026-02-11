// Mock dependencies BEFORE imports
import { mockCreateNativeStripeSdkMock } from '../testUtils';

jest.mock('../../specs/NativeStripeSdkModule', () =>
  mockCreateNativeStripeSdkMock()
);

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  loadConnectAndInitialize,
  ConnectComponentsProvider,
  useConnectComponents,
} from '../ConnectComponentsProvider';
import type { StripeConnectInitParams } from '../connectTypes';

describe('loadConnectAndInitialize', () => {
  const mockInitParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
    appearance: {
      variables: {
        colorPrimary: '#000000',
      },
    },
    locale: 'en',
  };

  it('creates ConnectInstance correctly', () => {
    const instance = loadConnectAndInitialize(mockInitParams);

    expect(instance).toBeDefined();
    expect(instance.update).toBeDefined();
  });

  it('returns instance with proper initParams', () => {
    const instance = loadConnectAndInitialize(mockInitParams);

    expect((instance as any).initParams).toEqual(mockInitParams);
  });

  it('update method can be called without error', () => {
    const instance = loadConnectAndInitialize(mockInitParams);

    expect(() => {
      instance.update({
        appearance: { variables: { colorPrimary: '#FF0000' } },
      });
    }).not.toThrow();
  });
});

describe('ConnectComponentsProvider', () => {
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

  it('throws error when passed non-ConnectInstance object', () => {
    const invalidInstance = { invalid: true };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(
        <ConnectComponentsProvider connectInstance={invalidInstance as any}>
          <></>
        </ConnectComponentsProvider>
      );
    }).toThrow(
      'connectInstance must be an instance of ConnectInstance created via loadConnectAndInitialize'
    );

    console.error = originalError;
  });

  it('correctly passes appearance and locale to context', () => {
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useConnectComponents();
      return null;
    };

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    expect(contextValue.appearance).toEqual(mockInitParams.appearance);
    expect(contextValue.locale).toEqual(mockInitParams.locale);
    expect(contextValue.connectInstance).toBe(connectInstance);
  });

  it('connectInstance.update() properly updates appearance state', async () => {
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useConnectComponents();
      return null;
    };

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    const newAppearance = {
      variables: {
        colorPrimary: '#FF0000',
      },
    };

    connectInstance.update({ appearance: newAppearance });

    await waitFor(() => {
      expect(contextValue.appearance).toEqual(newAppearance);
    });
  });

  it('connectInstance.update() properly updates locale state', async () => {
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useConnectComponents();
      return null;
    };

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    connectInstance.update({ locale: 'fr' });

    await waitFor(() => {
      expect(contextValue.locale).toBe('fr');
    });
  });

  it('update with both appearance and locale changes both states', async () => {
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useConnectComponents();
      return null;
    };

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    const newAppearance = {
      variables: {
        colorPrimary: '#00FF00',
      },
    };

    connectInstance.update({ appearance: newAppearance, locale: 'es' });

    await waitFor(() => {
      expect(contextValue.appearance).toEqual(newAppearance);
      expect(contextValue.locale).toBe('es');
    });
  });

  it('context value memoization works correctly', () => {
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    const contextValues: any[] = [];

    const TestComponent = () => {
      const context = useConnectComponents();
      contextValues.push(context);
      return null;
    };

    const { rerender } = render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    // Re-render without changes
    rerender(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    // Context value should be the same object (memoized)
    expect(contextValues[0]).toBe(contextValues[1]);
  });
});

describe('useConnectComponents', () => {
  it('throws error when used outside provider', () => {
    const TestComponent = () => {
      useConnectComponents();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow(
      'Could not find a ConnectComponentsContext; You need to wrap your components in an <ConnectComponentsProvider> provider.'
    );

    console.error = originalError;
  });

  it('provides context value when used inside provider', () => {
    const mockInitParams: StripeConnectInitParams = {
      publishableKey: 'pk_test_123',
      fetchClientSecret: jest.fn(async () => 'secret_123'),
    };
    const connectInstance = loadConnectAndInitialize(mockInitParams);
    let hasContext = false;

    const TestComponent = () => {
      const context = useConnectComponents();
      hasContext = !!context;
      return null;
    };

    render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <TestComponent />
      </ConnectComponentsProvider>
    );

    expect(hasContext).toBe(true);
  });
});
