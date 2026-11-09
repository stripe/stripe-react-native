import type { EventSubscription } from 'react-native';
import React from 'react';
import * as ReactNative from 'react-native';
import { render } from '@testing-library/react-native';
import { PaymentMethodMessagingElement } from '../PaymentMethodMessagingElement';
import { addListener } from '../../events';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock(
  '../../specs/NativePaymentMethodMessagingElement',
  () => require('react-native').View
);

const CONFIG = { amount: 5000, currency: 'usd' } as const;

type ConfigureHandler = (payload: Record<string, unknown>) => void;
type HeightHandler = (payload: Record<string, unknown>) => void;

let configureHandlers: ConfigureHandler[] = [];
let heightHandlers: HeightHandler[] = [];
const viewTags: number[] = [];
let nextSyntheticViewTag = 100;

beforeEach(() => {
  jest.resetAllMocks();
  configureHandlers = [];
  heightHandlers = [];
  viewTags.length = 0;
  nextSyntheticViewTag = 100;
  jest.mocked(addListener).mockImplementation((event, handler) => {
    if (event === 'paymentMethodMessagingElementConfigureResult') {
      configureHandlers.push(handler as ConfigureHandler);
    }
    if (event === 'paymentMethodMessagingElementDidUpdateHeight') {
      heightHandlers.push(handler as HeightHandler);
    }
    return { remove: jest.fn() } as unknown as EventSubscription;
  });
  jest.spyOn(ReactNative, 'findNodeHandle').mockImplementation((node) => {
    if (node == null) {
      return null;
    }
    const tag = nextSyntheticViewTag++;
    viewTags.push(tag);
    return tag;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function emitConfigure(payload: Record<string, unknown>) {
  configureHandlers.forEach((handler) => handler(payload));
}

it('forwards native configuration error messages', () => {
  const onStateChange = jest.fn();
  render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );
  emitConfigure({
    status: 'failed',
    message: 'currency is required',
    viewTag: viewTags[0],
  });
  expect(onStateChange).toHaveBeenCalledWith({
    status: 'failed',
    error: expect.objectContaining({ message: 'currency is required' }),
  });
});

it('forwards nested iOS error payloads and preserves code', () => {
  const onStateChange = jest.fn();
  render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );
  emitConfigure({
    status: 'failed',
    viewTag: viewTags[0],
    error: { message: 'amount is required', code: 'InvalidConfiguration' },
  });
  const failed = onStateChange.mock.calls[0][0];
  expect(failed.status).toBe('failed');
  expect(failed.error.message).toBe('amount is required');
  expect(failed.error.code).toBe('InvalidConfiguration');
});

it('ignores configure events for other view tags', () => {
  const onStateChange = jest.fn();
  render(
    <PaymentMethodMessagingElement
      configuration={CONFIG}
      onStateChange={onStateChange}
    />
  );
  const ownTag = viewTags[0];
  emitConfigure({ status: 'loaded', viewTag: ownTag });
  expect(onStateChange).toHaveBeenCalledWith({ status: 'loaded' });
  onStateChange.mockClear();
  emitConfigure({ status: 'loaded', viewTag: ownTag + 50 });
  expect(onStateChange).not.toHaveBeenCalled();
});
