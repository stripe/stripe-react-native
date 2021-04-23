/* eslint-disable no-undef */
const SELECTORS = {
  cardNumberEditText: driver.isAndroid
    ? 'card_number_edit_text'
    : 'card number',
  expDateEditText: driver.isAndroid
    ? 'expiry_date_edit_text'
    : 'expiration date',
  cvcEditText: driver.isAndroid ? 'cvc_edit_text' : 'CVC',
  postalCodeEditText: driver.isAndroid
    ? 'postal_code_edit_text'
    : 'postal code',
};

function getTextInputSelectorById(id: string) {
  return driver.isAndroid
    ? `//android.widget.EditText[@resource-id="com.example.reactnativestripesdk:id/${id}"]`
    : `~${id}`;
}

class CardField {
  getEditTextElement(selector: string) {
    if (driver.isAndroid) {
      return $(getTextInputSelectorById(selector));
    } else {
      return $(`~${selector}`);
    }
  }
  setCardNumber(value: string) {
    this.getEditTextElement(SELECTORS.cardNumberEditText).setValue(value);
  }
  setExpiryDate(value: string) {
    this.getEditTextElement(SELECTORS.expDateEditText).setValue(value);
  }
  setCvcNumber(value: string) {
    this.getEditTextElement(SELECTORS.cvcEditText).setValue(value);
  }
  setPostalCode(value: string) {
    this.getEditTextElement(SELECTORS.cvcEditText).setValue(value);
  }
}

export default new CardField();
