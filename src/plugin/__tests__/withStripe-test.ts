import { AndroidConfig } from '@expo/config-plugins';
import { resolve } from 'path';

import {
  setApplePayEntitlement,
  setGooglePayMetaData,
  setOnrampGradleProperty,
  setPodfileDisableSPM,
} from '../withStripe';

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
    let androidManifestJson =
      await readAndroidManifestAsync(sampleManifestPath);
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

describe('setOnrampGradleProperty', () => {
  it('adds StripeSdk_includeOnramp=true when includeOnramp is true', () => {
    const initialProperties = [
      {
        type: 'property' as const,
        key: 'StripeSdk_kotlinVersion',
        value: '1.8.0',
      },
    ];

    const result = setOnrampGradleProperty(true, initialProperties);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'property',
      key: 'StripeSdk_includeOnramp',
      value: 'true',
    });
  });

  it('removes StripeSdk_includeOnramp when includeOnramp is false', () => {
    const initialProperties = [
      {
        type: 'property' as const,
        key: 'StripeSdk_kotlinVersion',
        value: '1.8.0',
      },
      {
        type: 'property' as const,
        key: 'StripeSdk_includeOnramp',
        value: 'true',
      },
    ];

    const result = setOnrampGradleProperty(false, initialProperties);

    expect(result).toHaveLength(1);
    expect(
      result.find(
        (p) => p.type === 'property' && p.key === 'StripeSdk_includeOnramp'
      )
    ).toBeUndefined();
  });

  it('updates existing property value when includeOnramp is true', () => {
    const initialProperties = [
      {
        type: 'property' as const,
        key: 'StripeSdk_includeOnramp',
        value: 'false',
      },
    ];

    const result = setOnrampGradleProperty(true, initialProperties);

    expect(result[0]).toEqual({
      type: 'property',
      key: 'StripeSdk_includeOnramp',
      value: 'true',
    });
  });
});

describe('setPodfileDisableSPM', () => {
  // Mirrors the shape of the Podfile Expo generates: the flag must land
  // after `prepare_react_native_project!` and before the target block.
  const samplePodfile = [
    `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")`,
    '',
    'prepare_react_native_project!',
    '',
    "target 'StripeExpoTest' do",
    '  use_expo_modules!',
    'end',
    '',
  ].join('\n');

  it('inserts $StripeDisableSPM = true after prepare_react_native_project!', () => {
    const result = setPodfileDisableSPM(samplePodfile, true);

    expect(result).toContain('$StripeDisableSPM = true');
    expect(result.indexOf('prepare_react_native_project!')).toBeLessThan(
      result.indexOf('$StripeDisableSPM = true')
    );
    expect(result.indexOf('$StripeDisableSPM = true')).toBeLessThan(
      result.indexOf("target 'StripeExpoTest'")
    );
  });

  it('is idempotent when the flag is already present', () => {
    const once = setPodfileDisableSPM(samplePodfile, true);
    const twice = setPodfileDisableSPM(once, true);

    expect(twice).toEqual(once);
    expect(twice.match(/\$StripeDisableSPM = true/g)).toHaveLength(1);
  });

  it('removes a previously generated flag when disableSPM is false', () => {
    const enabled = setPodfileDisableSPM(samplePodfile, true);
    const disabled = setPodfileDisableSPM(enabled, false);

    expect(disabled).not.toContain('$StripeDisableSPM');
    expect(disabled).toEqual(samplePodfile);
  });

  it('leaves the Podfile untouched when disableSPM is false and no flag was generated', () => {
    expect(setPodfileDisableSPM(samplePodfile, false)).toEqual(samplePodfile);
  });
});
