import { unsupportedComponent, unsupportedModule } from './webUnsupported';
export type * from './NativeEmbeddedPaymentElement';
const webCommands: any = unsupportedModule(
  'EmbeddedPaymentElementView commands'
);
export { webCommands as Commands };
export default unsupportedComponent<any>('EmbeddedPaymentElementView');
