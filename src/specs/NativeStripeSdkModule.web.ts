import { unsupportedModule } from './webUnsupported';
import type { Spec } from './NativeStripeSdkModule';
export type * from './NativeStripeSdkModule';

const unsupported = unsupportedModule<Spec>('StripeSdk');

const webConstants: ReturnType<Spec['getConstants']> = {
  API_VERSIONS: { CORE: '', ISSUING: '' },
  SYSTEM_INFO: {
    sdkVersion: '',
    osVersion: '',
    deviceType: 'web',
    appName: '',
    appVersion: '',
    isNewArchitecture: false,
    reactNativeVersion: '',
  },
};

export default new Proxy(unsupported, {
  get(target, prop, receiver) {
    if (prop === 'getConstants') return () => webConstants;
    return Reflect.get(target, prop, receiver);
  },
}) as Spec;
