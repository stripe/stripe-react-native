import StripeSdk from '../NativeStripeSdk';
import { useEffect } from 'react';
import type { ThreeDSecureConfigurationParams } from 'src/types';

export type Params = ThreeDSecureConfigurationParams;

const default3dParams = {
  bodyTextColor: '#000000',
  bodyFontSize: 11,
  headingFontSize: 18,
  headingTextColor: '#000000',
  timeout: 5,
};

export function use3dSecureConfiguration(params: Params) {
  useEffect(() => {
    StripeSdk.configure3dSecure({
      ...default3dParams,
      ...params,
    });
  }, [params]);
}
