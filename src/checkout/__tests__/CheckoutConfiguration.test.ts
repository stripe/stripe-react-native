import { prepareCheckoutConfiguration } from '../CheckoutConfiguration';
import type { Checkout } from '../../types/Checkout';
import { CardBrand } from '../../types/Common';
import {
  NavigationBarStyle,
  PaymentMethodLayout,
  RowStyle,
  TermsDisplay,
} from '../../types/PaymentSheet';

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

  it('preserves the complete reviewed configuration while extracting its callback', () => {
    const onSelectPaymentOption = jest.fn();
    const options: Checkout.CreateOptions = {
      ...baseOptions,
      merchantDisplayName: 'Example Store',
      style: 'alwaysDark',
      defaults: {
        billingDetails: {
          name: 'Jenny Rosen',
          address: { country: 'US', postalCode: '94103' },
        },
        shippingDetails: {
          name: 'Jenny Rosen',
          address: { country: 'CA', postalCode: 'M5V 2T6' },
        },
        email: 'jenny@example.com',
        phone: '+15555555555',
      },
      paymentElement: {
        savePaymentMethodOptInBehavior: 'requiresOptOut',
        appearance: {
          font: { family: 'inter', scale: 1.1 },
          colors: { primary: '#112233' },
          shapes: { borderRadius: 12, borderWidth: 1 },
          primaryButton: {
            colors: { background: '#123456' },
            shapes: { borderRadius: 8, borderWidth: 1, height: 52 },
          },
          embeddedPaymentElement: {
            row: {
              style: RowStyle.FlatWithRadio,
              flat: { separatorThickness: 1 },
            },
          },
          formInsetValues: { left: 16, top: 8, right: 24, bottom: 32 },
          applyLiquidGlass: true,
          navigationBarStyle: NavigationBarStyle.Glass,
        },
        preferredNetworks: [CardBrand.Visa, CardBrand.Mastercard],
        billingDetailsCollectionConfiguration: {
          name: 'always',
          phone: 'always',
          address: 'full',
          attachDefaultsToPaymentMethod: true,
        },
        removeSavedPaymentMethodMessage: 'Remove this payment method?',
        paymentMethodOrder: ['card', 'link'],
        opensCardScannerAutomatically: true,
        termsDisplay: {
          card: TermsDisplay.NEVER,
          us_bank_account: TermsDisplay.AUTOMATIC,
        },
        paymentMethodLayout: PaymentMethodLayout.Vertical,
        displaysMandateText: true,
        rowSelectionBehavior: {
          type: 'immediateAction',
          onSelectPaymentOption,
        },
        applePay: { merchantCountryCode: 'US', buttonType: 'checkout' },
        googlePay: {
          testEnv: true,
          label: 'Total',
          buttonType: 'checkout',
          additionalEnabledNetworks: ['INTERAC'],
        },
        link: { display: 'never' },
      },
    };

    const prepared = prepareCheckoutConfiguration(options);

    expect(prepared.options).toEqual({
      ...options,
      paymentElement: {
        ...options.paymentElement,
        rowSelectionBehavior: { type: 'immediateAction' },
      },
    });
    expect(prepared.onSelectPaymentOption).toBe(onSelectPaymentOption);
  });
});
