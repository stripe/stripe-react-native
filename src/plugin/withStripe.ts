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
  merchantId: string;
};

const withStripe: ConfigPlugin<StripePluginProps> = (config, props) => {
  config = withStripeIos(config, props);
  return config;
};

export const withStripeIos: ConfigPlugin<StripePluginProps> = (
  config,
  { merchantId }
) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults = setApplePayEntitlement(merchantId, config.modResults);
    return config;
  });
};

/**
 * Add the following to the entitlements:
 *
 * <key>com.apple.developer.in-app-payments</key>
 * <array>
 *	 <string>[MERCHANT_ID]</string>
 * </array>
 */
export function setApplePayEntitlement(
  merchantId: string,
  entitlements: Record<string, any>
): Record<string, any> {
  const key = 'com.apple.developer.in-app-payments';

  const merchants: string[] = entitlements[key] ?? [];

  if (!merchants.includes(merchantId)) {
    merchants.push(merchantId);
  }

  entitlements[key] = merchants;
  return entitlements;
}

export default createRunOncePlugin(withStripe, pkg.name, pkg.version);
