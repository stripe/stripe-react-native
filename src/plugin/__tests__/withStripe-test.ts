import { AndroidConfig } from '@expo/config-plugins';
import { resolve } from 'path';

import { setApplePayEntitlement, setGooglePayMetaData } from '../withStripe';

jest.mock(
  '@stripe/stripe-react-native/package.json',
  () => ({
    name: 'stripe-react-native',
    version: '0.1.1',
  }),
  { virtual: true }
);

const { getMainApplicationOrThrow, readAndroidManifestAsync } =
  AndroidConfig.Manifest;

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'sample-AndroidManifest.xml');

describe('setApplePayEntitlement', () => {
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

  it(`does not add in-app-payments if no merchant ID is provided`, () => {
    expect(setApplePayEntitlement('', {})).toEqual({});
    expect(setApplePayEntitlement([], {})).toEqual({});
    expect(setApplePayEntitlement([''], {})).toEqual({});
  });

  it(`properly handles multiple merchantIdentifiers`, () => {
    expect(
      setApplePayEntitlement(['merchant.com.example', 'merchant.com.example'], {
        'com.apple.developer.in-app-payments': ['merchant.com.example'],
      })
    ).toMatchObject({
      'com.apple.developer.in-app-payments': ['merchant.com.example'],
    });

    expect(
      setApplePayEntitlement(
        ['merchant.com.example', 'merchant.com.example.different'],
        {
          'com.apple.developer.in-app-payments': ['merchant.com.example'],
        }
      )
    ).toMatchObject({
      'com.apple.developer.in-app-payments': [
        'merchant.com.example',
        'merchant.com.example.different',
      ],
    });
  });
});

describe('setGooglePayMetaData', () => {
  it(`Properly sets GooglePay metadata in AndroidManifest to true, then removes it when set to false`, async () => {
    let androidManifestJson = await readAndroidManifestAsync(
      sampleManifestPath
    );
    androidManifestJson = setGooglePayMetaData(true, androidManifestJson);
    let mainApplication = getMainApplicationOrThrow(androidManifestJson);
    if (!mainApplication['meta-data']) {
      throw new Error('Failed to add metadata to AndroidManifest.xml');
    }
    let apiKeyItem = mainApplication['meta-data'].filter(
      (e) => e.$['android:name'] === 'com.google.android.gms.wallet.api.enabled'
    );
    expect(apiKeyItem).toHaveLength(1);
    expect(apiKeyItem[0].$['android:value']).toMatch('true');

    // Now let's make sure we can set it back to false, and NOT add a new metadata item
    androidManifestJson = setGooglePayMetaData(false, androidManifestJson);
    mainApplication = getMainApplicationOrThrow(androidManifestJson);
    if (!mainApplication['meta-data']) {
      throw new Error('Failed to read metadata from AndroidManifest.xml');
    }
    apiKeyItem = mainApplication['meta-data'].filter(
      (e) => e.$['android:name'] === 'com.google.android.gms.wallet.api.enabled'
    );
    expect(apiKeyItem).toHaveLength(0);
  });
});
