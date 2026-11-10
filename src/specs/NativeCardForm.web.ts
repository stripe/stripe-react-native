import { unsupportedComponent, unsupportedModule } from './webUnsupported';
export type * from './NativeCardForm';
const webCommands: any = unsupportedModule('CardForm commands');
export { webCommands as Commands };
export default unsupportedComponent<any>('CardForm');
