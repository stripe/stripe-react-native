import React from 'react';
import type { ThreeDSecureConfigurationParams, InitStripeParams } from '../types';
/**
 *  Stripe Provider Component Props
 */
export interface Props {
    publishableKey: string;
    merchantIdentifier?: string;
    threeDSecureParams?: ThreeDSecureConfigurationParams;
    stripeAccountId?: string;
    children: React.ReactElement | React.ReactElement[];
    urlScheme?: string;
    setUrlSchemeOnAndroid?: boolean;
}
export declare const initStripe: (params: InitStripeParams) => Promise<void>;
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
export declare function StripeProvider({ children, publishableKey, merchantIdentifier, threeDSecureParams, stripeAccountId, urlScheme, setUrlSchemeOnAndroid, }: Props): JSX.Element;
