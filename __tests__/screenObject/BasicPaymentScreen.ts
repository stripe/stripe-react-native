/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from '../helpers';
import nativeAlert from './components/NativeAlert';

class BasicPaymentScreen {
  pay({
    email,
    bankName,
    iban,
    buttonText = 'Pay',
  }: {
    email: string;
    bankName?: string;
    iban?: string;
    buttonText?: string;
  }) {
    getTextInputByPlaceholder('E-mail').waitForDisplayed({ timeout: 10000 });
    getTextInputByPlaceholder('E-mail').setValue(email);

    if (bankName) {
      const input = getTextInputByPlaceholder('Bank name');
      expect(input).toBeDisplayed();
      input.setValue(bankName);
    }
    if (iban) {
      const ibanInput = getTextInputByPlaceholder('Iban');
      expect(ibanInput).toBeDisplayed();
      ibanInput.setValue(iban);
    }
    const button = getElementByText(buttonText);
    expect(button).toBeDisplayed();
    button.click();

    driver.pause(5000);
  }

  authorize() {
    driver.pause(5000);

    expect(driver.getContexts()[1]).toBeTruthy();

    driver.switchContext(driver.getContexts()[1]);

    const button = $('button*=Authorize');
    button.waitForDisplayed({ timeout: 10000 });
    expect(button).toBeDisplayed();
    button.click();

    driver.switchContext(driver.getContexts()[0]);
  }

  checkStatus(status: string = 'Success') {
    const alert = nativeAlert.getAlertElement(status);
    alert.waitForDisplayed({
      timeout: 10000,
    });
    expect(alert.getText()).toEqual(status);
  }
}

export default new BasicPaymentScreen();
