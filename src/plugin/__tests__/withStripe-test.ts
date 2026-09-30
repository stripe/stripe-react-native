import { AndroidConfig, withPodfile } from '@expo/config-plugins';
import type { ExportedConfig } from '@expo/config-plugins/build/Plugin.types';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

import withStripe, {
  setApplePayEntitlement,
  setGooglePayMetaData,
  setOnrampGradleProperty,
  setIdentityGradleProperty,
  setPodfileDisableSPM,
  setPodfileIdentity,
  setPodfileOnramp,
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

describe('setIdentityGradleProperty', () => {
  it('keeps the default configuration unchanged', () => {
    const properties = [
      { type: 'property' as const, key: 'unrelated', value: 'keep' },
    ];

    expect(setIdentityGradleProperty(false, [...properties])).toEqual(
      properties
    );
  });

  it('enables Identity idempotently and removes only its flag when disabled', () => {
    const original = [
      {
        type: 'property' as const,
        key: 'StripeSdk_includeOnramp',
        value: 'true',
      },
      { type: 'comment' as const, value: 'Keep this comment' },
    ];
    const enabled = setIdentityGradleProperty(true, [...original]);
    setIdentityGradleProperty(true, enabled);

    expect(enabled).toEqual([
      ...original,
      {
        type: 'property',
        key: 'StripeSdk_includeIdentity',
        value: 'true',
      },
    ]);
    expect(setIdentityGradleProperty(false, enabled)).toEqual(original);
  });

  it('updates an existing disabled Identity flag', () => {
    expect(
      setIdentityGradleProperty(true, [
        {
          type: 'property',
          key: 'StripeSdk_includeIdentity',
          value: 'false',
        },
      ])
    ).toEqual([
      {
        type: 'property',
        key: 'StripeSdk_includeIdentity',
        value: 'true',
      },
    ]);
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

describe('optional iOS modules', () => {
  let projectRoot: string;
  beforeAll(() => {
    projectRoot = mkdtempSync(resolve(tmpdir(), 'stripe-identity-plugin-'));
    const installedPackage = resolve(
      projectRoot,
      'node_modules/@stripe/stripe-react-native'
    );
    mkdirSync(installedPackage, { recursive: true });
    writeFileSync(resolve(installedPackage, 'package.json'), '{}');
  });
  afterAll(() => rmSync(projectRoot, { recursive: true, force: true }));

  const autolinking = '  config = use_native_modules!(config_command)';
  const samplePodfile = [
    'prepare_react_native_project!',
    "target 'StripeExpoTest' do",
    '  use_expo_modules!',
    autolinking,
    '  use_react_native!(:path => config[:reactNativePath])',
    'end',
    '',
  ].join('\n');
  const podPath = '../node_modules/@stripe/stripe-react-native';
  const podLine = `  pod 'stripe-react-native/Identity', :path => '${podPath}'`;

  async function runPodfileMod(
    contents: string,
    props: Partial<Parameters<typeof withStripe>[1]> = {}
  ) {
    const rawConfig = { name: 'StripeExpoTest', slug: 'stripe-expo-test' };
    const config = withStripe(rawConfig, {
      merchantIdentifier: '',
      enableGooglePay: false,
      ...props,
    }) as ExportedConfig & {
      mods: { ios: { podfile: Parameters<typeof withPodfile>[1] } };
    };
    const result = await config.mods!.ios!.podfile!({
      ...config,
      modRawConfig: rawConfig,
      modResults: { contents, path: 'Podfile', language: 'rb' },
      modRequest: {
        projectRoot,
        platformProjectRoot: resolve(projectRoot, 'ios'),
        modName: 'podfile',
        platform: 'ios',
        introspect: false,
      },
    });
    return result.modResults.contents;
  }

  it.each([
    autolinking,
    '  config = use_native_modules!',
    '  config = use_native_modules! # Keep this comment',
  ])('inserts Identity after autolinking: %s', (anchor) => {
    const result = setPodfileIdentity(
      samplePodfile.replace(autolinking, anchor),
      true,
      podPath
    );

    expect(result).toContain(podLine);
    expect(result.indexOf(anchor)).toBeLessThan(result.indexOf(podLine));
    expect(result.indexOf(podLine)).toBeLessThan(
      result.indexOf('  use_react_native!')
    );
  });

  it('is idempotent and restores the Podfile when disabled without a clean prebuild', () => {
    const enabled = setPodfileIdentity(samplePodfile, true, podPath);
    expect(setPodfileIdentity(enabled, true, podPath)).toEqual(enabled);
    expect(enabled.match(/pod 'stripe-react-native\/Identity'/g)).toHaveLength(
      1
    );
    expect(setPodfileIdentity(enabled, false, podPath)).toEqual(samplePodfile);
  });

  it('updates a generated path after moving the installed SDK', () => {
    const enabled = setPodfileIdentity(samplePodfile, true, podPath);
    const updated = setPodfileIdentity(enabled, true, '../packages/stripe');
    expect(updated).not.toContain(podPath);
    expect(updated).toContain(":path => '../packages/stripe'");
    expect(updated.match(/pod 'stripe-react-native\/Identity'/g)).toHaveLength(
      1
    );
  });

  it.each([
    "  pod 'stripe-react-native/Identity', :path => '../custom-stripe'",
    '  pod("stripe-react-native/Identity", :path => "../custom-stripe")',
  ])('preserves a manual Identity declaration on enable and disable', (pod) => {
    const manualPodfile = samplePodfile.replace(
      autolinking,
      `${autolinking}\n${pod}`
    );
    expect(setPodfileIdentity(manualPodfile, true, podPath)).toEqual(
      manualPodfile
    );
    expect(setPodfileIdentity(manualPodfile, false, podPath)).toEqual(
      manualPodfile
    );
  });

  it('escapes quotes and backslashes in the Ruby pod path', () => {
    const result = setPodfileIdentity(
      samplePodfile,
      true,
      "../Kenneth's SDK\\checkout"
    );
    expect(result).toContain(":path => '../Kenneth\\'s SDK\\\\checkout'");
  });

  it('fails clearly when enabled without a supported autolinking call', () => {
    const customPodfile = samplePodfile.replace(autolinking, '');
    expect(() => setPodfileIdentity(customPodfile, true, podPath)).toThrow(
      'Cannot enable Stripe Identity: no supported use_native_modules! call'
    );
    expect(setPodfileIdentity(customPodfile, false, podPath)).toEqual(
      customPodfile
    );
  });

  it('keeps default Expo builds unchanged', async () => {
    expect(await runPodfileMod(samplePodfile)).toEqual(samplePodfile);
  });

  it('wires includeIdentity into the iOS mod and removes the generated pod when disabled', async () => {
    const enabled = await runPodfileMod(samplePodfile, {
      includeIdentity: true,
    });
    expect(enabled).toContain("pod 'stripe-react-native/Identity'");
    expect(await runPodfileMod(enabled, { includeIdentity: true })).toEqual(
      enabled
    );
    expect(await runPodfileMod(enabled, { includeIdentity: false })).toEqual(
      samplePodfile
    );
  });

  it('leaves Onramp inclusion independent and retains it when Identity is disabled', async () => {
    const onramp = await runPodfileMod(samplePodfile, { includeOnramp: true });
    expect(onramp).toContain("pod 'stripe-react-native/Onramp'");
    expect(onramp).not.toContain("pod 'stripe-react-native/Identity'");
    const both = await runPodfileMod(samplePodfile, {
      includeOnramp: true,
      includeIdentity: true,
    });
    expect(await runPodfileMod(both, { includeOnramp: true })).toEqual(onramp);
  });

  it.each([
    { includeOnramp: true },
    { includeOnramp: true, includeIdentity: true },
  ])(
    'removes generated optional pods and supports re-enabling them: %j',
    async (props) => {
      const enabled = await runPodfileMod(samplePodfile, props);
      expect(await runPodfileMod(enabled, props)).toEqual(enabled);
      const disabled = await runPodfileMod(enabled, {});
      expect(disabled).toEqual(samplePodfile);
      expect(await runPodfileMod(disabled, props)).toEqual(enabled);
    }
  );

  it.each([false, true])(
    'removes the exact legacy Onramp line while includeIdentity is %s',
    async (includeIdentity) => {
      const onramp = await runPodfileMod(samplePodfile, {
        includeOnramp: true,
      });
      const legacyLine = onramp
        .split('\n')
        .find((line) => line.startsWith("  pod 'stripe-react-native/Onramp'"));
      expect(legacyLine).toBeDefined();
      const legacy = samplePodfile.replace(
        autolinking,
        `${autolinking}\n${legacyLine}`
      );
      // The previously generated Identity block must not hide the legacy line.
      const withIdentity = setPodfileIdentity(legacy, true, podPath);
      const result = await runPodfileMod(withIdentity, {
        includeIdentity,
        includeOnramp: false,
      });
      expect(result).toEqual(
        await runPodfileMod(samplePodfile, { includeIdentity })
      );
      expect(result).not.toContain("pod 'stripe-react-native/Onramp'");
    }
  );

  it('removes the exact legacy Onramp line only for an explicit opt-out', () => {
    const legacyLine = `  pod 'stripe-react-native/Onramp', :path => '${podPath}'`;
    const legacy = samplePodfile.replace(
      autolinking,
      `${autolinking}\n${legacyLine}`
    );
    const enabled = setPodfileOnramp(legacy, true, podPath);
    expect(enabled).toEqual(legacy);
    expect(setPodfileOnramp(legacy, undefined, podPath)).toEqual(legacy);
    expect(enabled.match(/pod 'stripe-react-native\/Onramp'/g)).toHaveLength(1);
    expect(setPodfileOnramp(enabled, false, podPath)).toEqual(samplePodfile);
    expect(setPodfileOnramp(legacy, false, podPath)).toEqual(samplePodfile);
  });

  it('keeps a legacy-shaped manual Onramp setup when the Expo option is omitted', async () => {
    const generated = await runPodfileMod(samplePodfile, {
      includeOnramp: true,
    });
    const line = generated
      .split('\n')
      .find((entry) => entry.startsWith("  pod 'stripe-react-native/Onramp'"));
    const manual = samplePodfile.replace(
      autolinking,
      `${autolinking}\n${line}`
    );
    expect(await runPodfileMod(manual, {})).toEqual(manual);
  });

  it.each([
    "  pod 'stripe-react-native/Onramp', :path => '../custom-stripe'",
    `  pod 'stripe-react-native/Onramp', :path => '${podPath}' # Manually configured`,
    `  pod "stripe-react-native/Onramp", :path => '${podPath}'`,
  ])(
    'preserves manual Onramp declarations on enable and disable: %s',
    (line) => {
      const manual = samplePodfile.replace(
        autolinking,
        `${autolinking}\n${line}`
      );
      expect(setPodfileOnramp(manual, true, podPath)).toEqual(manual);
      expect(setPodfileOnramp(manual, false, podPath)).toEqual(manual);
    }
  );

  it('preserves a canonical-looking manual Onramp line in another position', () => {
    const manual = samplePodfile.replace(
      autolinking,
      `${autolinking}\n\n  pod 'stripe-react-native/Onramp', :path => '${podPath}'`
    );
    expect(setPodfileOnramp(manual, true, podPath)).toEqual(manual);
    expect(setPodfileOnramp(manual, false, podPath)).toEqual(manual);
  });

  it.each(['Identity', 'Onramp'] as const)(
    'preserves an inline manual %s declaration without adding a duplicate',
    (subspec) => {
      const setPod =
        subspec === 'Identity' ? setPodfileIdentity : setPodfileOnramp;
      const manual = samplePodfile.replace(
        autolinking,
        `${autolinking}; pod 'stripe-react-native/${subspec}', path: '../custom-stripe'`
      );
      expect(setPod(manual, true, podPath)).toEqual(manual);
      expect(setPod(manual, false, podPath)).toEqual(manual);
    }
  );

  it.each(['Identity', 'Onramp'] as const)(
    'does not treat a commented %s setup example as an enabled pod',
    (subspec) => {
      const setPod =
        subspec === 'Identity' ? setPodfileIdentity : setPodfileOnramp;
      const comment = `  # Manual example; pod 'stripe-react-native/${subspec}', path: '../custom-stripe'`;
      const original = samplePodfile.replace(
        autolinking,
        `${autolinking}\n${comment}`
      );
      const enabled = setPod(original, true, podPath);
      expect(enabled).toContain(comment);
      expect(enabled).toContain(
        `@generated begin @stripe/stripe-react-native-${subspec}`
      );
      expect(setPod(enabled, false, podPath)).toEqual(original);
    }
  );

  it('updates a generated Onramp path without retaining the previous dependency', () => {
    const enabled = setPodfileOnramp(samplePodfile, true, podPath);
    const moved = setPodfileOnramp(enabled, true, '../packages/stripe');
    expect(moved).not.toContain(podPath);
    expect(moved).toContain(":path => '../packages/stripe'");
    expect(moved.match(/pod 'stripe-react-native\/Onramp'/g)).toHaveLength(1);
    expect(setPodfileOnramp(moved, false, '../packages/stripe')).toEqual(
      samplePodfile
    );
  });
});
