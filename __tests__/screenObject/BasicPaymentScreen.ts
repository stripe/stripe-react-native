/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from '../helpers';
import nativeAlert from './components/NativeAlert';

class BasicPaymentScreen {
  pay() {
    getTextInputByPlaceholder('E-mail').waitForDisplayed({ timeout: 10000 });
    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');
    getElementByText('Pay').click();
    driver.pause(5000);
  }

  authorize() {
    expect(driver.getContexts()[1]).toBeTruthy();

    driver.switchContext(driver.getContexts()[1]);

    $('button*=Authorize').waitForDisplayed();
    $('button*=Authorize').click();

    driver.switchContext(driver.getContexts()[0]);

    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 5000,
    });
    expect(alert.getText()).toEqual('Success');
  }
}

export default new BasicPaymentScreen();
