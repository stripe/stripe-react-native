import { NativeModules } from 'react-native';

type NativeStripeSdkType = {
  initialise(publishableKey: string): void;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
