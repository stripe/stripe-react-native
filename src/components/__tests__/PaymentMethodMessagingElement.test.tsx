import React from 'react';
import * as ReactNative from 'react-native';
import { render } from '@testing-library/react-native';
import { PaymentMethodMessagingElement } from '../PaymentMethodMessagingElement';

let mockInitialConfigureResult: Record<string, unknown> | null = null;

jest.mock('../../specs/NativePaymentMethodMessagingElement', () => {
  const MockReact = require('react');
  const { View } = require('react-native');

  return function MockPaymentMethodMessagingElement(
    props: Record<string, unknown>
  ) {
    if (mockInitialConfigureResult != null) {
      const result = mockInitialConfigureResult;
      mockInitialConfigureResult = null;
      const onConfigureResult = props.onConfigureResult as
        | ((mockPayload: unknown) => void)
        | undefined;
      onConfigureResult?.({ nativeEvent: { result } });
    }

    return MockReact.createElement(View, props);
  };
});

const CONFIG = { amount: 5000, currency: 'usd' } as const;

beforeEach(() => {
  jest.resetAllMocks();
  mockInitialConfigureResult = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function emitConfigure(
  view: {
    props: {
      onConfigureResult(event: {
        nativeEvent: { result: Record<string, unknown> };
      }): void;
    };
  },
  result: Record<string, unknown>
) {
  view.props.onConfigureResult({ nativeEvent: { result } });
}

it('forwards an invalid initial configuration result from the native view', () => {
  const onStateChange = jest.fn();
  mockInitialConfigureResult = {
    status: 'failed',
    message: 'currency is required',
    viewTag: 101,
  };

  render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );

  expect(onStateChange).toHaveBeenCalledWith({
    status: 'failed',
    error: expect.objectContaining({ message: 'currency is required' }),
  });
});

it('forwards nested iOS error payloads and preserves code', () => {
  const onStateChange = jest.fn();
  const { UNSAFE_getByType } = render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );
  emitConfigure(UNSAFE_getByType(ReactNative.View), {
    status: 'failed',
    error: { message: 'amount is required', code: 'InvalidConfiguration' },
  });
  const failed = onStateChange.mock.calls[0][0];
  expect(failed.status).toBe('failed');
  expect(failed.error.message).toBe('amount is required');
  expect(failed.error.code).toBe('InvalidConfiguration');
});

it('forwards loaded direct configure results', () => {
  const onStateChange = jest.fn();
  const { UNSAFE_getByType } = render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );
  emitConfigure(UNSAFE_getByType(ReactNative.View), { status: 'loaded' });
  expect(onStateChange).toHaveBeenCalledWith({ status: 'loaded' });
});
