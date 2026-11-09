import { useEffect, type ComponentType } from 'react';

/**
 * Web stand-ins for React Native codegen specs and TurboModules.
 *
 * Expo apps with `web.output: "server"` (the Expo SDK 58 default template) pull every route
 * into a web server bundle. These stubs let that bundle resolve `@stripe/stripe-react-native`
 * without importing `react-native/Libraries/*` codegen internals. Payment UI still does not run
 * on web; imports succeed and calls fail with {@link StripeWebUnsupportedError}.
 *
 * **Error styles on web**
 * - Result-style APIs (for example `initPaymentSheet`, `confirmPayment`) catch native failures and
 *   return `{ error }` where `error.code === 'WebUnsupported'`.
 * - Direct native calls (for example `initStripe`, `isPlatformPaySupported`) throw
 *   {@link StripeWebUnsupportedError} at call time.
 * - Fabric components render `null` and throw from `useEffect` on mount so static rendering does
 *   not fail while still surfacing an error in the client.
 */

export const webUnsupportedMessage = (name: string) =>
  `@stripe/stripe-react-native: ${name} is not supported on web. The Stripe React Native SDK supports iOS and Android only.`;

export class StripeWebUnsupportedError extends Error {
  code = 'WebUnsupported';
  constructor(name: string) {
    super(webUnsupportedMessage(name));
    this.name = 'StripeWebUnsupportedError';
  }
}

/** A native module stand-in whose every method throws when called. */
export function unsupportedModule<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      if (
        typeof prop === 'symbol' ||
        prop === '__esModule' ||
        prop === 'then'
      ) {
        return undefined;
      }
      return () => {
        throw new StripeWebUnsupportedError(`${name}.${String(prop)}()`);
      };
    },
  });
}

/** A native component stand-in that throws when it renders. */
export function unsupportedComponent<P = object>(
  name: string
): ComponentType<P> {
  const Unsupported = (): null => {
    useEffect(() => {
      throw new StripeWebUnsupportedError(`<${name}>`);
    }, []);
    return null;
  };
  Unsupported.displayName = `${name}(web unsupported)`;
  return Unsupported;
}
