import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
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
  onCompleteAction: CodegenTypes.DirectEventHandler<FormDetailsEvent>;
  formStyle?: UnsafeMixed<AuBECSDebitFormComponent.Styles>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AuBECSDebitForm'
) as ComponentType;
