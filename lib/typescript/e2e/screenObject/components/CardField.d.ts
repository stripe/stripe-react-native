/// <reference types="webdriverio/sync" />
declare class CardField {
    getEditTextElement(selector: string): WebdriverIO.Element;
    setCardNumber(value: string): void;
    setExpiryDate(value: string): void;
    setCvcNumber(value: string): void;
    setPostalCode(value: string): void;
}
declare const _default: CardField;
export default _default;
