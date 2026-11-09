import {
  CheckoutExpressCheckoutElementView,
  ExpressCheckoutElementView,
} from '../../components/ExpressCheckoutElementView';
import type { CheckoutExpressCheckoutElement } from '../../types/CheckoutElements';

it('exposes the Checkout alias and rejects rendering until native support is implemented', () => {
  const element: CheckoutExpressCheckoutElement = {};
  expect(CheckoutExpressCheckoutElementView).toBe(ExpressCheckoutElementView);
  expect(() => ExpressCheckoutElementView({ element })).toThrow(
    'does not include native support for Express Checkout Element'
  );
});
