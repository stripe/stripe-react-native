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
};

const withStripe: ConfigPlugin<StripePluginProps> = (config, props) => {
  config = withStripeIos(config, props);
  config = withNoopSwiftFile(config);
  config = withStripeAndroid(config, props);
  return config;
};

const withStripeIos: ConfigPlugin<StripePluginProps> = (
  expoConfig,
  { merchantIdentifier, includeOnramp = false }
) => {
  let resultConfig = withEntitlementsPlist(expoConfig, (entitlementsConfig) => {
    entitlementsConfig.modResults = setApplePayEntitlement(
      merchantIdentifier,
      entitlementsConfig.modResults
    );
    return entitlementsConfig;
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
