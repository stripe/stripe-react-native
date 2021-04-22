/* eslint-disable no-undef */

import nativeAlert from './screenObject/NativeAlert';
import editText from './screenObject/EditText';

describe('Simple App testing', () => {
  beforeEach(() => {
    // $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  it('Bancontact payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      $('~bank-redirects').click();
      $('~bancontact-payment').click();

      $('~email').waitForDisplayed({ timeout: 11000 });
      $('~email').setValue('test@stripe.com');

      $('~pay').click();

      driver.pause(5000);

      driver.switchContext(driver.getContexts()[1]);

      $('button*=Authorize').click();

      driver.switchContext(driver.getContexts()[0]);

      const alert = $('android=resourceId("android:id/alertTitle")');
      alert.waitForDisplayed({
        timeout: 5000,
      });
      expect(alert.getText()).toEqual('Success');
    }
  });

  it('Card payment using webhooks scenario', () => {
    $('~accept-a-payment').click();
    $('~e-mail').waitForDisplayed({ timeout: 10000 });
    $('~e-mail').setValue('test@stripe.com');

    editText.setCardNumber('4242424242424242');
    editText.setExpiryDate('12/22');
    editText.setCvcNumber('123');

    $('~pay').click();

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

  it.only('Setup future payment scenario', () => {
    $('~more-payment-scenarios').click();
    $('~setup-future-payments').click();
    $('~e-mail').waitForDisplayed({ timeout: 10000 });
    $('~e-mail').setValue('test@stripe.com');
    editText.setCardNumber('4242424242424242');
    editText.setExpiryDate('12/22');
    editText.setCvcNumber('123');
    $('~save').click();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
