import { NativeModules } from 'react-native';

type StripeSdkType = {
  multiply(a: number, b: number): Promise<number>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as StripeSdkType;
