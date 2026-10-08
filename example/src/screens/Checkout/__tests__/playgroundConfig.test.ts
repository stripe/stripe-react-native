import {
  buildSessionParameters,
  checkoutConfiguration,
  defaultPlaygroundSettings,
  resolvedEmail,
  validateSettings,
} from '../playgroundConfig';

describe('Checkout playground configuration', () => {
  it('builds the standard stripe-ios cart request', () => {
    expect(buildSessionParameters(defaultPlaygroundSettings)).toMatchObject({
      currency: 'usd',
      customer_email: 'jenny@example.com',
      customer_creation: 'always',
      automatic_tax: { enabled: true },
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'IE', 'GB'],
      },
      items: [
        {
          type: 'one_time_price',
          one_time_price: {
            items: [
              expect.objectContaining({ quantity: 2 }),
              expect.objectContaining({ quantity: 1 }),
            ],
          },
        },
      ],
    });
  });

  it('builds the zero-amount cart scenario', () => {
    const request = buildSessionParameters({
      ...defaultPlaygroundSettings,
      cartScenario: 'zeroAmount',
    }) as { items: Array<{ one_time_price: { items: unknown[] } }> };

    expect(request.items[0]?.one_time_price.items).toEqual([
      expect.objectContaining({
        quantity: 1,
        price_data: expect.objectContaining({ unit_amount: 0 }),
      }),
    ]);
  });

  it('uses the Adaptive Pricing test email convention', () => {
    const settings = {
      ...defaultPlaygroundSettings,
      adaptivePricingCountry: 'FR' as const,
    };

    expect(resolvedEmail(settings)).toBe('test+location_FR@example.com');
    expect(buildSessionParameters(settings)).toMatchObject({
      adaptive_pricing: { enabled: true },
      customer_email: 'test+location_FR@example.com',
    });
    expect(
      checkoutConfiguration({
        clientSecret: 'cs_test_secret',
        settings,
      })
    ).toMatchObject({ currencySelectorElement: {} });
  });

  it('rejects incompatible server email and customer settings', () => {
    expect(
      validateSettings({
        ...defaultPlaygroundSettings,
        customerType: 'new',
      })
    ).toContain('requires Guest');
  });

  it('maps local defaults into Checkout configuration', () => {
    const configuration = checkoutConfiguration({
      clientSecret: 'cs_test_secret',
      settings: {
        ...defaultPlaygroundSettings,
        emailSource: 'local',
        defaultShippingAddressOption: 'usTestAddress',
      },
    });

    expect(configuration).toMatchObject({
      clientSecret: 'cs_test_secret',
      defaults: {
        email: 'jenny@example.com',
        shippingDetails: {
          name: 'Jenny Rosen',
          address: { country: 'US', postalCode: '94103' },
        },
      },
      paymentElement: { link: { display: 'automatic' } },
    });
  });
});
