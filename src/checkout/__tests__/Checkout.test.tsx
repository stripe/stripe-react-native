import { renderHook } from '@testing-library/react-native';
import { CheckoutPaymentElementView } from '../../components/CheckoutPaymentElementView';
import { useCheckout } from '../../hooks/useCheckout';
import type { Checkout, CheckoutPaymentElement } from '../../types/Checkout';
import { createCheckout } from '../createCheckout';

const CHECKOUT_NOT_IMPLEMENTED_MESSAGE =
  'This version of @stripe/stripe-react-native does not include native support for the Checkout private preview.';

const createOptions: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret_example',
  returnURL: 'example://stripe-redirect',
};

describe('Checkout private-preview stubs', () => {
  it('rejects imperative controller creation', async () => {
    await expect(createCheckout(createOptions)).rejects.toThrow(
      CHECKOUT_NOT_IMPLEMENTED_MESSAGE
    );
  });

  it('stays idle while the hook is disabled', () => {
    const getConfiguration = jest.fn(async () => createOptions);
    const { result } = renderHook(() =>
      useCheckout({ enabled: false, getConfiguration })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(getConfiguration).not.toHaveBeenCalled();
  });

  it('reports the missing native implementation when enabled', async () => {
    const getConfiguration = jest.fn(async () => createOptions);
    const { result } = renderHook(() => useCheckout({ getConfiguration }));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual({
      code: 'Failed',
      message: CHECKOUT_NOT_IMPLEMENTED_MESSAGE,
    });
    expect(getConfiguration).not.toHaveBeenCalled();
    await expect(result.current.reload()).rejects.toThrow(
      CHECKOUT_NOT_IMPLEMENTED_MESSAGE
    );
  });

  it('throws when the inline Payment Element stub is rendered', () => {
    const element: CheckoutPaymentElement = {
      present: () => Promise.resolve(),
    };

    expect(() => CheckoutPaymentElementView({ element })).toThrow(
      CHECKOUT_NOT_IMPLEMENTED_MESSAGE
    );
  });
});
