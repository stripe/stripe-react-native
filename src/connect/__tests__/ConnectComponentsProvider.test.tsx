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

describe('connectInstance.update() persistence', () => {
  const initParams: StripeConnectInitParams = {
    publishableKey: 'pk_test_123',
    fetchClientSecret: jest.fn(async () => 'secret_123'),
    appearance: { variables: { colorPrimary: '#000000' } },
    locale: 'en',
  };
  const newAppearance = { variables: { colorPrimary: '#FF0000' } };

  const renderProvider = (connectInstance: any) => {
    const seen: { current: any } = { current: undefined };
    const Consumer = () => {
      seen.current = useConnectComponents();
      return null;
    };
    const utils = render(
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <Consumer />
      </ConnectComponentsProvider>
    );
    return { seen, ...utils };
  };

  it('applies an update made before any provider has mounted', () => {
    const connectInstance = loadConnectAndInitialize(initParams);

    connectInstance.update({ appearance: newAppearance, locale: 'fr' });
    const { seen } = renderProvider(connectInstance);

    expect(seen.current.appearance).toEqual(newAppearance);
    expect(seen.current.locale).toBe('fr');
  });

  it('applies an update made while no provider was mounted to a later provider', () => {
    const connectInstance = loadConnectAndInitialize(initParams);
    const first = renderProvider(connectInstance);
    first.unmount();

    connectInstance.update({ appearance: newAppearance });
    const second = renderProvider(connectInstance);

    expect(second.seen.current.appearance).toEqual(newAppearance);
  });

  it('keeps updating a provider that mounts after another one unmounted', async () => {
    const connectInstance = loadConnectAndInitialize(initParams);
    renderProvider(connectInstance).unmount();
    const second = renderProvider(connectInstance);

    connectInstance.update({ locale: 'de' });

    await waitFor(() => {
      expect(second.seen.current.locale).toBe('de');
    });
  });

  it('updates every provider that is mounted on the same instance', async () => {
    const connectInstance = loadConnectAndInitialize(initParams);
    const a = renderProvider(connectInstance);
    const b = renderProvider(connectInstance);

    connectInstance.update({ appearance: newAppearance });

    await waitFor(() => {
      expect(a.seen.current.appearance).toEqual(newAppearance);
      expect(b.seen.current.appearance).toEqual(newAppearance);
    });
  });

  it('keeps the other value when only one of appearance and locale is updated', () => {
    const connectInstance = loadConnectAndInitialize(initParams);

    connectInstance.update({ locale: 'fr' });
    const { seen } = renderProvider(connectInstance);

    expect(seen.current.appearance).toEqual(initParams.appearance);
    expect(seen.current.locale).toBe('fr');
  });

  it('does not change the init params object the caller passed in', () => {
    const params = {
      ...initParams,
      appearance: { variables: { colorPrimary: '#000000' } },
    };
    const connectInstance = loadConnectAndInitialize(params);

    connectInstance.update({ appearance: newAppearance, locale: 'fr' });

    expect(params.appearance).toEqual({
      variables: { colorPrimary: '#000000' },
    });
    expect(params.locale).toBe('en');
  });

  it('stops listening for updates once a provider has unmounted', () => {
    const connectInstance = loadConnectAndInitialize(initParams);
    const { unmount } = renderProvider(connectInstance);
    expect((connectInstance as any).listeners.size).toBe(1);

    unmount();

    expect((connectInstance as any).listeners.size).toBe(0);
    expect(() =>
      connectInstance.update({ appearance: newAppearance })
    ).not.toThrow();
  });

  it('follows a different instance when the connectInstance prop changes', () => {
    const first = loadConnectAndInitialize(initParams);
    const second = loadConnectAndInitialize({
      ...initParams,
      appearance: newAppearance,
      locale: 'es',
    });
    const seen: { current: any } = { current: undefined };
    const Consumer = () => {
      seen.current = useConnectComponents();
      return null;
    };
    const { rerender } = render(
      <ConnectComponentsProvider connectInstance={first}>
        <Consumer />
      </ConnectComponentsProvider>
    );

    rerender(
      <ConnectComponentsProvider connectInstance={second}>
        <Consumer />
      </ConnectComponentsProvider>
    );

    expect(seen.current.appearance).toEqual(newAppearance);
    expect(seen.current.locale).toBe('es');
  });
});
