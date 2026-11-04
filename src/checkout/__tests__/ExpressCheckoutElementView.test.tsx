import React from 'react';
import { View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CheckoutExpressCheckoutElementView,
  ExpressCheckoutElementView,
} from '../../components/ExpressCheckoutElementView';
import { createCheckoutElements } from '../createCheckoutElements';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import { checkoutSession as session } from '../__fixtures__/session';

jest.mock('../../events', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock(
  '../../specs/NativeCheckoutExpressCheckoutElement',
  () => require('react-native').View
);
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: { createCheckout: jest.fn(), destroyCheckout: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

it('exposes the Checkout alias and rejects foreign handles', () => {
  expect(CheckoutExpressCheckoutElementView).toBe(ExpressCheckoutElementView);
  expect(() => ExpressCheckoutElementView({ element: {} })).toThrow(
    'Express Checkout Element was not created by this SDK.'
  );
});

it('renders available elements, follows native height, and resets height on replacement', async () => {
  const options = {
    clientSecret: 'cs_test_secret',
    returnURL: 'example://checkout',
    expressCheckoutElement: { onResult: jest.fn() },
  };
  const create = NativeStripeSdk.createCheckout as jest.Mock;
  create
    .mockResolvedValueOnce({ session, isExpressCheckoutAvailable: true })
    .mockResolvedValueOnce({ session, isExpressCheckoutAvailable: false })
    .mockResolvedValueOnce({ session, isExpressCheckoutAvailable: true });
  const first = await createCheckoutElements(options);
  const unavailable = await createCheckoutElements(options);
  const second = await createCheckoutElements(options);
  expect(unavailable.expressCheckoutElement).toBeNull();
  const { UNSAFE_getByType, rerender, unmount } = render(
    <ExpressCheckoutElementView element={first.expressCheckoutElement!} />
  );
  expect(UNSAFE_getByType(View).props.controllerId).toBe(
    create.mock.calls[0][1]
  );
  fireEvent(UNSAFE_getByType(View), 'heightChanged', {
    nativeEvent: { height: 96 },
  });
  expect(UNSAFE_getByType(View).props.style).toEqual({ height: 96 });
  rerender(
    <ExpressCheckoutElementView element={second.expressCheckoutElement!} />
  );
  expect(UNSAFE_getByType(View).props.controllerId).toBe(
    create.mock.calls[2][1]
  );
  expect(UNSAFE_getByType(View).props.style).toEqual({ height: 1 });
  unmount();
  await Promise.all([first.destroy(), unavailable.destroy(), second.destroy()]);
  expect(() =>
    ExpressCheckoutElementView({ element: first.expressCheckoutElement! })
  ).toThrow('Express Checkout Element was not created by this SDK.');
});
