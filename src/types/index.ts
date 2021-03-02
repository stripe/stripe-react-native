export * from './ApplePay';
export * from './PaymentIntents';
export * from './PaymentMethods';
export * from './SetupIntent';
export * from './ThreeDSecure';
export * from './components/ApplePayButtonComponent';
export * from './components/CardFieldInput';
export * from './Errors';
/**
 * @ignore
 */
export type Dictionary<T> = {
  [key: string]: T;
};

/**
 * @ignore
 */
export type Nullable<T> = T | null;

export interface AppInfo {
  name?: string;
  partnerId?: string;
  url?: string;
  version?: string;
}
