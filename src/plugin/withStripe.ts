import {
  ConfigPlugin,
  createRunOncePlugin,
  withEntitlementsPlist,
} from '@expo/config-plugins';

const pkg = require('stripe-react-native/package.json');

type StripePluginProps = {
  /**
   * The iOS merchant ID used for enabling Apple Pay.
   * Without this, the error "Missing merchant identifier" will be thrown on iOS.
   */
  merchantIdentifier: string;
};

const withStripe: ConfigPlugin<StripePluginProps> = (config, props) => {
  config = withStripeIos(config, props);
  return config;
};

export const withStripeIos: ConfigPlugin<StripePluginProps> = (
  expoConfig,
  { merchantIdentifier }
) => {
  return withEntitlementsPlist(expoConfig, (config) => {
    config.modResults = setApplePayEntitlement(
      merchantIdentifier,
      config.modResults
    );
    return config;
  });
};

/**
 * Add the following to the entitlements:
 *
 * <key>com.apple.developer.in-app-payments</key>
 * <array>
 *	 <string>[MERCHANT_IDENTIFIER]</string>
 * </array>
 */
export function setApplePayEntitlement(
  merchantIdentifier: string,
  entitlements: Record<string, any>
): Record<string, any> {
  const key = 'com.apple.developer.in-app-payments';

  const merchants: string[] = entitlements[key] ?? [];

  if (!merchants.includes(merchantIdentifier)) {
    merchants.push(merchantIdentifier);
  }

  entitlements[key] = merchants;
  return entitlements;
}

export default createRunOncePlugin(withStripe, pkg.name, pkg.version);
