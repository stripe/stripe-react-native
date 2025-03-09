import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type FormDetails = Readonly<{
  accountNumber: string;
  bsbNumber: string;
  email: string;
  name: string;
}>;

type FormStyles = Readonly<{
  borderWidth?: Int32;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: Int32;
  textColor?: string;
  fontSize?: Int32;
  placeholderColor?: string;
  textErrorColor?: string;
}>;

export interface NativeProps extends ViewProps {
  companyName: string;
  onCompleteAction: DirectEventHandler<FormDetails>;
  formStyle?: FormStyles;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>(
  'AuBECSDebitForm'
) as ComponentType;
