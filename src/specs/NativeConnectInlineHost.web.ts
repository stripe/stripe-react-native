import { unsupportedComponent, unsupportedModule } from './webUnsupported';
export type * from './NativeConnectInlineHost';
const webCommands: any = unsupportedModule('StripeConnectInlineHost commands');
export { webCommands as Commands };
export default unsupportedComponent<any>('StripeConnectInlineHost');
