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
   * Includes native Identity verification on iOS and Android.
   * Requires minSdkVersion 24 or higher on Android.
   * Defaults to false; Onramp also includes Identity on both platforms.
   */
  includeIdentity?: boolean;
  /**
   * iOS only. When true, sets `$StripeDisableSPM = true` in the generated
   * Podfile, so the Stripe iOS SDK is resolved through the CocoaPods registry
   * instead of Swift Package Manager.
   * Defaults to false (SPM resolution on React Native >= 0.75, which requires
   * `expo-build-properties` with `"useFrameworks": "dynamic"`).
   * WARNING: CocoaPods support is deprecated and future Stripe SDK versions
   * will not provide this option. Only use it as a last resort to temporarily
   * support static linking, old React Native versions, or as a stopgap workaround.
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
  {
    merchantIdentifier,
    includeOnramp,
    includeIdentity = false,
    disableSPM = false,
  }
) => {
  let resultConfig = withEntitlementsPlist(expoConfig, (entitlementsConfig) => {
    entitlementsConfig.modResults = setApplePayEntitlement(
      merchantIdentifier,
      entitlementsConfig.modResults
    );
    return entitlementsConfig;
  });

  // Always run the Podfile mod: turning an option back off must remove its
  // generated block, because `expo prebuild` without --clean reuses the Podfile.
  resultConfig = withPodfile(resultConfig, (config) => {
    let contents = setPodfileDisableSPM(config.modResults.contents, disableSPM);
    // Remove our Identity block before migrating a legacy Onramp line, whose
    // ownership signature is its position immediately after autolinking.
    contents = setPodfileIdentity(contents, false, '');
    const needsPodPath =
      includeIdentity ||
      includeOnramp ||
      (includeOnramp === false &&
        contents.includes("pod 'stripe-react-native/Onramp', :path => '"));
    const relativePodPath = needsPodPath
      ? path.relative(
          path.join(config.modRequest.projectRoot, 'ios'),
          path.dirname(
            require.resolve('@stripe/stripe-react-native/package.json', {
              paths: [config.modRequest.projectRoot],
            })
          )
        )
      : '';
    contents = setPodfileOnramp(contents, includeOnramp, relativePodPath);
    config.modResults.contents = setPodfileIdentity(
      contents,
      includeIdentity,
      relativePodPath
    );
    return config;
  });

  return resultConfig;
};

const DISABLE_SPM_TAG = '@stripe/stripe-react-native-disableSPM';

/**
 * Includes the optional Identity subspec after React Native autolinking.
 * Only the generated block is managed; manually configured pods are preserved.
 */
export function setPodfileIdentity(
  contents: string,
  includeIdentity: boolean,
  relativePodPath: string
): string {
  return setPodfileOptionalModule(
    contents,
    'Identity',
    includeIdentity,
    relativePodPath
  );
}

/** Includes Onramp and removes only generated or explicitly disabled legacy setup. */
export function setPodfileOnramp(
  contents: string,
  includeOnramp: boolean | undefined,
  relativePodPath: string
): string {
  // Older plugin versions inserted this exact untagged line immediately after
  // this exact autolinking call. Only an explicit opt-out removes that signature:
  // a matching hand-written line is indistinguishable, so an omitted option must
  // preserve it. Other paths, positions, comments, and formatting are user-owned.
  const lines = contents.split('\n');
  const anchorIndex = lines.findIndex((line) =>
    /^[\t ]*config = use_native_modules!\(config_command\)\r?$/.test(line)
  );
  const legacyPodLine = `  pod 'stripe-react-native/Onramp', :path => '${relativePodPath}'`;
  if (
    includeOnramp === false &&
    anchorIndex >= 0 &&
    lines[anchorIndex + 1]?.replace(/\r$/, '') === legacyPodLine
  ) {
    lines.splice(anchorIndex + 1, 1);
  }
  return setPodfileOptionalModule(
    lines.join('\n'),
    'Onramp',
    includeOnramp === true,
    relativePodPath
  );
}

function setPodfileOptionalModule(
  contents: string,
  subspec: 'Identity' | 'Onramp',
  enabled: boolean,
  relativePodPath: string
): string {
  const tag = `@stripe/stripe-react-native-${subspec}`;
  const withoutGenerated = removeGeneratedContents(contents, tag) ?? contents;
  if (!enabled) {
    return withoutGenerated;
  }

  // Keep a manually configured pod as the source of truth, including
  // custom paths. Adding another declaration could give CocoaPods two sources.
  const manualPod = new RegExp(
    `(?:^|;)[\\t ]*pod[\\t ]*(?:\\([\\t ]*)?(['"])stripe-react-native/${subspec}\\1(?=[\\t ,)]|$)`,
    'm'
  );
  if (
    withoutGenerated
      .split('\n')
      .some((line) => !line.trimStart().startsWith('#') && manualPod.test(line))
  ) {
    return withoutGenerated;
  }

  const anchor =
    /^[\t ]*config[\t ]*=[\t ]*use_native_modules!(?:[\t ]*\([^\r\n]*\))?[\t ]*(?:#.*)?$/m;
  if (!anchor.test(withoutGenerated)) {
    throw new Error(
      `Cannot enable Stripe ${subspec}: no supported use_native_modules! call was found in the Podfile. Add the stripe-react-native/${subspec} pod manually after React Native autolinking.`
    );
  }

  const escapedPodPath = relativePodPath
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  return mergeContents({
    src: withoutGenerated,
    newSrc: `  pod 'stripe-react-native/${subspec}', :path => '${escapedPodPath}'`,
    tag,
    anchor,
    offset: 1,
    comment: '#',
  }).contents;
}

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
 * target block on every Expo SDK's template
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
  { enableGooglePay = false, includeOnramp = false, includeIdentity = false }
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
    config.modResults = setIdentityGradleProperty(
      includeIdentity,
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
  return setOptionalModuleGradleProperty(
    'StripeSdk_includeOnramp',
    includeOnramp,
    modResults
  );
}

/** Adds or removes the Android Identity opt-in without changing other flags. */
export function setIdentityGradleProperty(
  includeIdentity: boolean,
  modResults: AndroidConfig.Properties.PropertiesItem[]
): AndroidConfig.Properties.PropertiesItem[] {
  return setOptionalModuleGradleProperty(
    'StripeSdk_includeIdentity',
    includeIdentity,
    modResults
  );
}

function setOptionalModuleGradleProperty(
  key: string,
  enabled: boolean,
  modResults: AndroidConfig.Properties.PropertiesItem[]
): AndroidConfig.Properties.PropertiesItem[] {
  // Find existing property if it exists
  const existingPropertyIndex = modResults.findIndex(
    (item) => item.type === 'property' && item.key === key
  );

  if (enabled) {
    // Add or update the property to true
    const propertyItem = {
      type: 'property' as const,
      key,
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
