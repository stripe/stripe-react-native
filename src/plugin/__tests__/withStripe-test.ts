import { setApplePayEntitlement } from '../withStripe';

describe(setApplePayEntitlement, () => {
  it(`sets the apple pay entitlement when none exist`, () => {
    expect(setApplePayEntitlement('merchant.com.example', {})).toMatchObject({
      'com.apple.developer.in-app-payments': ['merchant.com.example'],
    });
  });

  it(`sets the apple pay entitlement when some already exist`, () => {
    expect(
      setApplePayEntitlement('merchant.com.example', {
        'com.apple.developer.in-app-payments': [
          'some.other.merchantIdentifier',
        ],
      })
    ).toMatchObject({
      'com.apple.developer.in-app-payments': [
        'some.other.merchantIdentifier',
        'merchant.com.example',
      ],
    });
  });

  it(`does not duplicate the merchantIdentifier in entitlements`, () => {
    expect(
      setApplePayEntitlement('merchant.com.example', {
        'com.apple.developer.in-app-payments': ['merchant.com.example'],
      })
    ).toMatchObject({
      'com.apple.developer.in-app-payments': ['merchant.com.example'],
    });
  });
});
