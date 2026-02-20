import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { AuBECSDebitFormComponent } from '../types';
import type { UnsafeMixed } from './utils';

type FormDetailsEvent = Readonly<{
  accountNumber: string;
  bsbNumber: string;
  email: string;
  name: string;
}>;

export interface NativeProps extends ViewProps {
  companyName: string;
  onCompleteAction: DirectEventHandler<FormDetailsEvent>;
  formStyle?: UnsafeMixed<AuBECSDebitFormComponent.Styles>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AuBECSDebitForm'
) as ComponentType;
