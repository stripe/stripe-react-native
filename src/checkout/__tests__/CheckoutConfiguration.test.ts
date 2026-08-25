import { prepareCheckoutConfiguration } from '../CheckoutConfiguration';
import type { Checkout } from '../../types/Checkout';

const baseOptions: Checkout.CreateOptions = {
  clientSecret: 'cs_test_secret_123',
  returnURL: 'example://checkout',
};

describe('prepareCheckoutConfiguration', () => {
  it('leaves configuration without a Payment Element unchanged', () => {
    const prepared = prepareCheckoutConfiguration(baseOptions);

    expect(prepared).toEqual({ options: baseOptions });
  });

  it('passes the default row-selection behavior without a callback', () => {
    const options: Checkout.CreateOptions = {
      ...baseOptions,
      paymentElement: {
        rowSelectionBehavior: { type: 'default' },
      },
    };

    const prepared = prepareCheckoutConfiguration(options);

    expect(prepared.options.paymentElement?.rowSelectionBehavior).toEqual({
      type: 'default',
    });
    expect(prepared.onSelectPaymentOption).toBeUndefined();
  });

  it('extracts an immediate-action callback from native options', () => {
    const onSelectPaymentOption = jest.fn();
    const options: Checkout.CreateOptions = {
      ...baseOptions,
      paymentElement: {
        paymentMethodOrder: ['card', 'link'],
        rowSelectionBehavior: {
          type: 'immediateAction',
          onSelectPaymentOption,
        },
      },
    };

    const prepared = prepareCheckoutConfiguration(options);

    expect(prepared.options.paymentElement).toEqual({
      paymentMethodOrder: ['card', 'link'],
      rowSelectionBehavior: { type: 'immediateAction' },
    });
    expect(prepared.onSelectPaymentOption).toBe(onSelectPaymentOption);
    expect(options.paymentElement?.rowSelectionBehavior).toEqual({
      type: 'immediateAction',
      onSelectPaymentOption,
    });
  });
});
