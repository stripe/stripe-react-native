/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from '../helpers';

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
      const select = getElementByText('Optional - choose your bank');
      expect(select).toBeDisplayed();
      select.click();
      const listItem = getElementByText(bankName);
      listItem.click();
    }
    if (iban) {
      const ibanInput = getTextInputByPlaceholder('Iban');
      expect(ibanInput).toBeDisplayed();
      ibanInput.setValue(iban);
    }

    const button = driver.isAndroid
      ? $(
          `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${buttonText}"))`
        )
      : $(`~${buttonText}`);
    expect(button).toBeDisplayed();
    button.click();

    driver.pause(5000);
  }

  authorize({ elementType = 'button', pause = 5000 } = {}) {
    driver.pause(pause);

    expect(driver.getContexts()[1]).toBeTruthy();

    driver.switchContext(driver.getContexts()[2] ?? driver.getContexts()[1]);

    const button = $(`${elementType}*=Authorize`);
    button.waitForDisplayed({ timeout: 10000 });
    expect(button).toBeDisplayed();
    button.click();

    driver.switchContext(driver.getContexts()[0]);
  }

  checkStatus(status: string = 'Success') {
    const alert = getElementByText(status);
    alert.waitForDisplayed({
      timeout: 10000,
    });
    expect(alert.getText()).toEqual(status);
  }
}

export default new BasicPaymentScreen();
