import { checkoutSession as session } from '../__fixtures__/session';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CheckoutCurrencySelectorElementView } from '../../components/CheckoutCurrencySelectorElementView';
import { createCheckout } from '../createCheckout';
import type { Checkout } from '../../types/Checkout';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';

jest.mock('../../events', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock(
  '../../specs/NativeCheckoutCurrencySelectorElement',
  () => require('react-native').View
);
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: { createCheckout: jest.fn(), destroyCheckout: jest.fn() },
}));

it('exposes only available elements and follows their native height', async () => {
  const options: Checkout.CreateOptions = {
    clientSecret: 'cs_test_secret',
    returnURL: 'example://checkout',
    currencySelectorElement: {},
  };
  (NativeStripeSdk.createCheckout as jest.Mock)
    .mockResolvedValueOnce({ session, isCurrencySelectorAvailable: true })
    .mockResolvedValueOnce({ session, isCurrencySelectorAvailable: false });
  const available = await createCheckout(options);
  const unavailable = await createCheckout(options);
  expect(unavailable.currencySelectorElement).toBeNull();
  const { getByTestId } = render(
    <CheckoutCurrencySelectorElementView
      testID="element"
      element={available.currencySelectorElement!}
    />
  );
  expect(getByTestId('element').props.controllerId).toBe(
    (NativeStripeSdk.createCheckout as jest.Mock).mock.calls[0][1]
  );
  fireEvent(getByTestId('element'), 'heightChanged', {
    nativeEvent: { height: 72 },
  });
  expect(getByTestId('element')).toHaveStyle({ height: 72 });
  await Promise.all([available.destroy(), unavailable.destroy()]);
});
