import React, { useEffect } from 'react';

import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import NativeOnrampSdk from '../specs/NativeOnrampSdkModule';
import { isAndroid, shouldAttributeExpo } from '../helpers';
import type { AppInfo, InitStripeParams, InitialiseParams } from '../types';
import { packageInfo } from '../packageInfo';
import { AppRegistry, Platform } from 'react-native';

const EXPO_PARTNER_ID = 'pp_partner_JBN7LkABco2yUu';

/**
 *  Stripe Provider Component Props
 */
export type Props = InitStripeParams & {
  children: React.ReactElement | React.ReactElement[];
};

const appInfo: AppInfo = {
  name: shouldAttributeExpo() ? `${packageInfo.name}/expo` : packageInfo.name,
  url: packageInfo.url,
  version: packageInfo.version,
  partnerId: shouldAttributeExpo() ? EXPO_PARTNER_ID : undefined,
};

let didRegisterHeadlessTask = false;

export const initStripe = async (params: InitStripeParams): Promise<void> => {
  // On Android when the activity is paused, JS timers are paused,
  // which causes network requests to hang indefinitely on new arch.
  // To work around this, we register a headless task that will keep
  // the JS runtime running while the Stripe UI is opened.
  // This task is started and stopped by the native module.
  if (Platform.OS === 'android' && !didRegisterHeadlessTask) {
    function stripeHeadlessTask() {
      return new Promise<void>(() => {});
    }

    AppRegistry.registerHeadlessTask(
      'StripeKeepJsAwakeTask',
      () => stripeHeadlessTask
    );
    didRegisterHeadlessTask = true;
  }

  const extendedParams: InitialiseParams = { ...params, appInfo };
  await NativeStripeSdk.initialise(extendedParams);

  if (Platform.OS === 'android') {
    await NativeOnrampSdk?.initialise(extendedParams);
  }
};

/**
 *  StripeProvider Component
 *
 * @example
 * ```ts
 *  <StripeProvider
 *    publishableKey="_publishableKey"
 *    merchantIdentifier="merchant.com.stripe.react.native"
 *    threeDSecureParams={{
 *      backgroundColor: "#FFF",
 *      timeout: 5,
 *    }}
 *  >
 *    <App />
 *  </StripeProvider>
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function StripeProvider({
  children,
  publishableKey,
  merchantIdentifier,
  threeDSecureParams,
  stripeAccountId,
  urlScheme,
  setReturnUrlSchemeOnAndroid,
}: Props) {
  useEffect(() => {
    if (!publishableKey) {
      return;
    }
    const initializeStripe = async () => {
      if (isAndroid) {
        await initStripe({
          publishableKey,
          stripeAccountId,
          threeDSecureParams,
          urlScheme,
          setReturnUrlSchemeOnAndroid,
        });
      } else {
        await initStripe({
          publishableKey,
          stripeAccountId,
          threeDSecureParams,
          merchantIdentifier,
          urlScheme,
        });
      }
    };

    initializeStripe();
  }, [
    publishableKey,
    merchantIdentifier,
    stripeAccountId,
    threeDSecureParams,
    urlScheme,
    setReturnUrlSchemeOnAndroid,
  ]);

  return <>{children}</>;
}
