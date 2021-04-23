/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import BasicPaymentScreen from './screenObject/BasicPaymentScreen';
import nativeAlert from './screenObject/components//NativeAlert';
import cardField from './screenObject/components/CardField';
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

      BasicPaymentScreen.pay();
      BasicPaymentScreen.authorize();
    }
  });

  it('Bancontact future payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Bancontact SEPA Direct Debit set up');

      BasicPaymentScreen.pay();
      BasicPaymentScreen.authorize();
    }
  });

  it('EPS payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('EPS');

      BasicPaymentScreen.pay();
      BasicPaymentScreen.authorize();
    }
  });

  it('Fpx payment scenario', () => {
    // webview handling
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('FPX');

    BasicPaymentScreen.pay();

    getElementByText('Public Bank').click();
    driver.pause(5000);
    BasicPaymentScreen.authorize();
  });

  it('P24 payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Przelewy24');

      BasicPaymentScreen.pay();
      BasicPaymentScreen.authorize();
    }
  });

  it('Card payment using webhooks scenario', () => {
    homeScreen.goTo('Accept a payment');
    getTextInputByPlaceholder('E-mail').waitForDisplayed({ timeout: 10000 });
    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');

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
    getTextInputByPlaceholder('E-mail').waitForDisplayed({ timeout: 10000 });
    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');
    getElementByText('Save').click();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
