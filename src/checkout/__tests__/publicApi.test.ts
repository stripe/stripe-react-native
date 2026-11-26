import {
  CheckoutCurrencySelectorElementView,
  CheckoutExpressCheckoutElementView,
  CheckoutPaymentElementView,
  ExpressCheckoutElementView,
  clearCheckoutLocalCustomerData,
  createCheckoutElements,
  useCheckoutElements,
} from '../../index';
import type { CheckoutElements } from '../../index';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import { checkoutSession as session } from '../__fixtures__/session';

jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    checkoutControllerDidUpdate: jest.fn(() => ({ remove: jest.fn() })),
    checkoutControllerDidSelectPaymentOption: jest.fn(() => ({
      remove: jest.fn(),
    })),
    checkoutExpressCheckoutDidComplete: jest.fn(() => ({ remove: jest.fn() })),
    checkoutServerUpdateRequested: jest.fn(() => ({ remove: jest.fn() })),
    getConstants: jest.fn(() => ({})),
    createCheckout: jest.fn(),
    destroyCheckout: jest.fn(),
    clearCheckoutLocalCustomerData: jest.fn(),
  },
}));

it('creates a Checkout controller through the package entry point', async () => {
  const options: CheckoutElements.CreateOptions = {
    clientSecret: 'cs_test_secret',
    returnURL: 'example://checkout',
  };
  jest.mocked(NativeStripeSdk.createCheckout).mockResolvedValue({
    session,
    isCurrencySelectorAvailable: false,
  });

  const controller: CheckoutElements = await createCheckoutElements(options);

  expect(NativeStripeSdk.createCheckout).toHaveBeenCalledWith(
    options,
    expect.any(String)
  );
  expect(controller.session).toBe(session);
  await controller.destroy();
});

it('exports the Checkout hook, element views, and Express Checkout alias', () => {
  expect(typeof useCheckoutElements).toBe('function');
  expect(typeof CheckoutPaymentElementView).toBe('function');
  expect(typeof CheckoutCurrencySelectorElementView).toBe('function');
  expect(typeof ExpressCheckoutElementView).toBe('function');
  expect(CheckoutExpressCheckoutElementView).toBe(ExpressCheckoutElementView);
});

it('clears Checkout customer data through the package entry point', async () => {
  await clearCheckoutLocalCustomerData();

  expect(NativeStripeSdk.clearCheckoutLocalCustomerData).toHaveBeenCalledTimes(
    1
  );
});
