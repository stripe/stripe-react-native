/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import nativeAlert from './screenObject/components//NativeAlert';
import editText from './screenObject/components/EditText';
import homeScreen from './screenObject/HomeScreen';

describe('Example app payments scenarios', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('Bancontact payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Bancontact Payment');

      getTextInputByPlaceholder('E-mail').waitForDisplayed({
        timeout: 11000,
      });
      getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');

      $('~pay').click();

      driver.pause(5000);

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
  });

  it('Card payment using webhooks scenario', () => {
    homeScreen.goTo('Accept a payment');
    $('//android.widget.EditText').waitForDisplayed({ timeout: 10000 });
    $('//android.widget.EditText').setValue('test@stripe.com');

    editText.setCardNumber('4242424242424242');
    editText.setExpiryDate('12/22');
    editText.setCvcNumber('123');

    getElementByText('Pay').click();

    driver.pause(10000);
    if (driver.isAndroid) {
      driver.back();
    }
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Setup future payment scenario', () => {
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Set up future payments');
    $('//android.widget.EditText').waitForDisplayed({ timeout: 10000 });
    $('//android.widget.EditText').setValue('test@stripe.com');
    editText.setCardNumber('4242424242424242');
    editText.setExpiryDate('12/22');
    editText.setCvcNumber('123');
    getElementByText('Save').click();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
