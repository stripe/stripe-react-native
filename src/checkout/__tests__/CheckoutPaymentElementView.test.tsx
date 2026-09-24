import { checkoutSession as session } from '../__fixtures__/session';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CheckoutPaymentElementView } from '../../components/CheckoutPaymentElementView';
import { createCheckout } from '../createCheckout';
import type { Checkout } from '../../types/Checkout';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';

jest.mock('../../events', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock(
  '../../specs/NativeCheckoutPaymentElement',
  () => require('react-native').View
);
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: { createCheckout: jest.fn(), destroyCheckout: jest.fn() },
}));

it('routes the controller ID and resets native height when the element changes', async () => {
  const options: Checkout.CreateOptions = {
    clientSecret: 'cs_test_secret',
    returnURL: 'example://checkout',
  };
  (NativeStripeSdk.createCheckout as jest.Mock)
    .mockResolvedValueOnce({ controllerId: 'controller-1', session })
    .mockResolvedValueOnce({ controllerId: 'controller-2', session });
  const first = await createCheckout(options);
  const second = await createCheckout(options);
  const { getByTestId, rerender, unmount } = render(
    <CheckoutPaymentElementView
      testID="element"
      element={first.paymentElement}
    />
  );
  expect(getByTestId('element').props.controllerId).toBe(
    (NativeStripeSdk.createCheckout as jest.Mock).mock.calls[0][1]
  );
  fireEvent(getByTestId('element'), 'heightChanged', {
    nativeEvent: { height: 140 },
  });
  expect(getByTestId('element')).toHaveStyle({ height: 140 });
  rerender(
    <CheckoutPaymentElementView
      testID="element"
      element={second.paymentElement}
    />
  );
  expect(getByTestId('element').props.controllerId).toBe(
    (NativeStripeSdk.createCheckout as jest.Mock).mock.calls[1][1]
  );
  expect(getByTestId('element')).toHaveStyle({ height: 1 });
  unmount();
  await Promise.all([first.destroy(), second.destroy()]);
});
