import {
  AndroidConfig,
  ConfigPlugin,
  createRunOncePlugin,
  IOSConfig,
  withAndroidManifest,
  withEntitlementsPlist,
  withGradleProperties,
  withPodfile,
} from '@expo/config-plugins';
import {
  mergeContents,
  removeGeneratedContents,
} from '@expo/config-plugins/build/utils/generateCode';
import path from 'path';

const {
  addMetaDataItemToMainApplication,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} = AndroidConfig.Manifest;

const pkg = require('@stripe/stripe-react-native/package.json');

type StripePluginProps = {
  /**
   * The iOS merchant ID used for enabling Apple Pay.
   * Without this, the error "Missing merchant identifier" will be thrown on iOS.
   */
  merchantIdentifier: string | string[];
  enableGooglePay: boolean;
  /**
   * Whether to include Onramp functionality in the build.
   * When true, adds StripeSdk_includeOnramp=true to gradle.properties for Android
   * and includes the Onramp pod for iOS.
   * Defaults to false.
   */
  includeOnramp?: boolean;
  /**
   * iOS only. When true, sets `$StripeDisableSPM = true` in the generated
   * Podfile, so the Stripe iOS SDK is resolved through the CocoaPods registry
   * instead of Swift Package Manager (available while Stripe continues to
   * publish pods). Use this to opt out of SPM resolution — for example to
   * keep building with static frameworks, which SPM mode does not support.
   * Defaults to false (SPM resolution on React Native >= 0.75, which requires
   * `expo-build-properties` with `"useFrameworks": "dynamic"`).
   */
  disableSPM?: boolean;
};

const withStripe: ConfigPlugin<StripePluginProps> = (config, props) => {
  config = withStripeIos(config, props);
  config = withNoopSwiftFile(config);
  config = withStripeAndroid(config, props);
  return config;
};

const withStripeIos: ConfigPlugin<StripePluginProps> = (
  expoConfig,
  { merchantIdentifier, includeOnramp = false, disableSPM = false }
) => {
  let resultConfig = withEntitlementsPlist(expoConfig, (entitlementsConfig) => {
    entitlementsConfig.modResults = setApplePayEntitlement(
      merchantIdentifier,
      entitlementsConfig.modResults
    );
    return entitlementsConfig;
  });

  // Always run the Podfile mod (not just when disableSPM is true): when the
  // option is turned back off, the previously generated block must be removed
  // again, because `expo prebuild` without --clean reuses the existing
  // Podfile.
  resultConfig = withPodfile(resultConfig, (config) => {
    config.modResults.contents = setPodfileDisableSPM(
      config.modResults.contents,
      disableSPM
    );
    return config;
  });

  // Conditionally include Onramp pod for iOS.
  if (includeOnramp) {
    resultConfig = withPodfile(resultConfig, (config) => {
      const podfile = config.modResults.contents;

      const localPodPath = path.dirname(
        require.resolve('@stripe/stripe-react-native/package.json', {
          paths: [config.modRequest.projectRoot],
        })
      );
      const relativePodPath = path.relative(
        path.join(config.modRequest.projectRoot, 'ios'),
        localPodPath
      );

      // Using Expo BuildProperties with `extraPods` unfortunately results in
      // an empty pod, so we're modifying the Podfile directly. The pod line
      // *must* come after the use_native_modules! call.
      const podLine = `  pod 'stripe-react-native/Onramp', :path => '${relativePodPath}'`;

      if (!podfile.includes(podLine)) {
        config.modResults.contents = podfile.replace(
          'config = use_native_modules!(config_command)',
          (match) => `${match}\n${podLine}`
        );
      }

      return config;
    });
  }

  return resultConfig;
};

const DISABLE_SPM_TAG = '@stripe/stripe-react-native-disableSPM';

/**
 * Adds `$StripeDisableSPM = true` to the Podfile (inside a tagged
 * `@generated` block) when `disableSPM` is true, and removes any previously
 * generated block when it is false.
 *
 * The flag is read by stripe_spm.rb when CocoaPods evaluates the
 * stripe-react-native podspec, so it must be defined before any `target`
 * block. The Podfile Expo generates opens with
 * `prepare_react_native_project!` at the top level, which makes it a stable
 * anchor: inserting immediately after it guarantees the flag precedes the
 * target block on every Expo SDK's template. (Same approach as
 * react-native-firebase's `ios.disableSPM` plugin option.)
 */
export function setPodfileDisableSPM(
  contents: string,
  disableSPM: boolean
): string {
  if (!disableSPM) {
    return removeGeneratedContents(contents, DISABLE_SPM_TAG) ?? contents;
  }

  return mergeContents({
    src: contents,
    newSrc: '$StripeDisableSPM = true',
    tag: DISABLE_SPM_TAG,
    anchor: /prepare_react_native_project!/,
    offset: 1,
    comment: '#',
  }).contents;
}

/**
 * Adds the following to the entitlements:
 *
 * <key>com.apple.developer.in-app-payments</key>
 * <array>
 *	 <string>[MERCHANT_IDENTIFIER]</string>
 * </array>
 */
export function setApplePayEntitlement(
  merchantIdentifiers: string | string[],
  entitlements: Record<string, any>
): Record<string, any> {
  const key = 'com.apple.developer.in-app-payments';

  const merchants: string[] = entitlements[key] ?? [];

  if (!Array.isArray(merchantIdentifiers)) {
    merchantIdentifiers = [merchantIdentifiers];
  }

  for (const id of merchantIdentifiers) {
    if (id && !merchants.includes(id)) {
      merchants.push(id);
    }
  }

  if (merchants.length) {
    entitlements[key] = merchants;
  }
  return entitlements;
}

/**
 * Add a blank Swift file to the Xcode project for Swift compatibility.
 */
export const withNoopSwiftFile: ConfigPlugin = (config) => {
  return IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'noop-file.swift',
    contents: [
      '//',
      '// @generated',
      '// A blank Swift file must be created for native modules with Swift files to work correctly.',
      '//',
      '',
    ].join('\n'),
  });
};

const withStripeAndroid: ConfigPlugin<StripePluginProps> = (
  expoConfig,
  { enableGooglePay = false, includeOnramp = false }
) => {
  let resultConfig = withAndroidManifest(expoConfig, (config) => {
    config.modResults = setGooglePayMetaData(
      enableGooglePay,
      config.modResults
    );

    return config;
  });

  resultConfig = withGradleProperties(resultConfig, (config) => {
    config.modResults = setOnrampGradleProperty(
      includeOnramp,
      config.modResults
    );

    return config;
  });

  return resultConfig;
};

/**
 * Adds the following to AndroidManifest.xml:
 *
 * <application>
 *   ...
 *	 <meta-data
 *     android:name="com.google.android.gms.wallet.api.enabled"
 *     android:value="true|false" />
 * </application>
 */
export function setGooglePayMetaData(
  enabled: boolean,
  modResults: AndroidConfig.Manifest.AndroidManifest
): AndroidConfig.Manifest.AndroidManifest {
  const GOOGLE_PAY_META_NAME = 'com.google.android.gms.wallet.api.enabled';
  const mainApplication = getMainApplicationOrThrow(modResults);
  if (enabled) {
    addMetaDataItemToMainApplication(
      mainApplication,
      GOOGLE_PAY_META_NAME,
      'true'
    );
  } else {
    removeMetaDataItemFromMainApplication(
      mainApplication,
      GOOGLE_PAY_META_NAME
    );
  }

  return modResults;
}

/**
 * Adds or removes the StripeSdk_includeOnramp property in gradle.properties.
 *
 * @param includeOnramp Whether to include Onramp functionality
 * @param modResults The current gradle.properties as PropertiesItem array
 * @returns Modified PropertiesItem array
 */
export function setOnrampGradleProperty(
  includeOnramp: boolean,
  modResults: AndroidConfig.Properties.PropertiesItem[]
): AndroidConfig.Properties.PropertiesItem[] {
  const ONRAMP_PROPERTY_KEY = 'StripeSdk_includeOnramp';

  // Find existing property if it exists
  const existingPropertyIndex = modResults.findIndex(
    (item) => item.type === 'property' && item.key === ONRAMP_PROPERTY_KEY
  );

  if (includeOnramp) {
    // Add or update the property to true
    const propertyItem = {
      type: 'property' as const,
      key: ONRAMP_PROPERTY_KEY,
      value: 'true',
    };

    if (existingPropertyIndex >= 0) {
      // Update existing property
      modResults[existingPropertyIndex] = propertyItem;
    } else {
      // Add new property at the end
      modResults.push(propertyItem);
    }
  } else {
    // Remove the property if it exists
    if (existingPropertyIndex >= 0) {
      modResults.splice(existingPropertyIndex, 1);
    }
  }

  return modResults;
}

export default createRunOncePlugin(withStripe, pkg.name, pkg.version);
