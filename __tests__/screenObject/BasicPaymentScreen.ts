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
      getTextInputByPlaceholder('Bank name').setValue(bankName);
    }
    if (iban) {
      getTextInputByPlaceholder('Iban').setValue(iban);
    }
    getElementByText(buttonText).click();

    driver.pause(5000);
  }

  authorize() {
    expect(driver.getContexts()[1]).toBeTruthy();

    driver.switchContext(driver.getContexts()[1]);

    $('button*=Authorize').waitForDisplayed();
    $('button*=Authorize').click();

    driver.switchContext(driver.getContexts()[0]);
  }

  checkStatus(status: string = 'Success') {
    const alert = nativeAlert.getAlertElement(status);
    alert.waitForDisplayed({
      timeout: 5000,
    });
    expect(alert.getText()).toEqual(status);
  }
}

export default new BasicPaymentScreen();
