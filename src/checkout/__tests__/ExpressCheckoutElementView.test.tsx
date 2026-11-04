import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, View } from 'react-native';
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

afterEach(() => jest.restoreAllMocks());

it('exposes the Checkout alias and keeps iOS rendering unsupported', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  expect(CheckoutExpressCheckoutElementView).toBe(ExpressCheckoutElementView);
  expect(() => ExpressCheckoutElementView({ element: {} })).toThrow(
    'does not include native support for Express Checkout Element'
  );
});

it('rejects Android elements that were not created by this SDK', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  expect(() => ExpressCheckoutElementView({ element: {} })).toThrow(
    'Express Checkout Element was not created by this SDK.'
  );
});

it('routes the controller ID, follows native height, and resets height when the handle changes', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const create = NativeStripeSdk.createCheckout as jest.Mock;
  create
    .mockReset()
    .mockResolvedValue({ session, isExpressCheckoutAvailable: true });
  const options = {
    clientSecret: 'cs_test_secret',
    returnURL: 'example://checkout',
    expressCheckoutElement: { onResult: jest.fn() },
  };
  const first = await createCheckoutElements(options);
  const second = await createCheckoutElements(options);
  const { UNSAFE_getByType, rerender, unmount } = render(
    <ExpressCheckoutElementView element={first.expressCheckoutElement!} />
  );
  const nativeElement = () => UNSAFE_getByType(View);
  expect(nativeElement().props.controllerId).toBe(create.mock.calls[0][1]);
  expect(nativeElement().props.style).toEqual({ width: '100%', height: 1 });
  fireEvent(nativeElement(), 'heightChanged', { nativeEvent: { height: 56 } });
  expect(nativeElement().props.style).toEqual({ width: '100%', height: 56 });
  fireEvent(nativeElement(), 'heightChanged', { nativeEvent: { height: 112 } });
  expect(nativeElement().props.style).toEqual({ width: '100%', height: 112 });
  rerender(
    <ExpressCheckoutElementView element={second.expressCheckoutElement!} />
  );
  expect(nativeElement().props.controllerId).toBe(create.mock.calls[1][1]);
  expect(nativeElement().props.style).toEqual({ width: '100%', height: 1 });
  unmount();
  await Promise.all([first.destroy(), second.destroy()]);
});
