/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import BasicPaymentScreen from './screenObject/BasicPaymentScreen';
import nativeAlert from './screenObject/components/NativeAlert';
import cardField from './screenObject/components/CardField';
import homeScreen from './screenObject/HomeScreen';
import BECSForm from './screenObject/components/BECSForm';

describe('Example app payments scenarios (common)', () => {
  beforeEach(() => {
    // driver.saveScreen(`screen-${new Date().getTime()}`);
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });
  afterEach(() => {
    // driver.saveScreen(`screen-${new Date().getTime()}`);
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('BECS direct payment scenario', () => {
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('BECS Direct Debit payment');

    BECSForm.setName('stripe');
    BECSForm.setEmail('test@stripe.com');
    BECSForm.setBSB('000000');
    BECSForm.setAccountNumber('000123456');

    const button = getElementByText('Pay');
    expect(button).toBeDisplayed();
    button.click();

    BasicPaymentScreen.checkStatus('Processing');
  });

  it('BECS direct set up payment scenario', () => {
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('BECS Direct Debit set up');

    BECSForm.setName('stripe');
    BECSForm.setEmail('test@stripe.com');
    BECSForm.setBSB('000000');
    BECSForm.setAccountNumber('000123456');

    const button = getElementByText('Save');
    expect(button).toBeDisplayed();
    button.click();

    BasicPaymentScreen.checkStatus('Success');
  });

  it('SEPA payment scenario', () => {
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('SEPA Direct Debit payment');

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      iban: 'AT611904300234573201',
    });
    BasicPaymentScreen.checkStatus('Processing');
  });

  it('SEPA set up payment scenario', () => {
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('SEPA Direct Debit set up');

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      buttonText: 'Save IBAN',
      iban: 'AT611904300234573201',
    });
    BasicPaymentScreen.checkStatus();
  });

  it('Card payment using webhooks scenario', () => {
    homeScreen.goTo('Accept a payment');
    homeScreen.goTo('Card element only');
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

  it('Finalize payment on the server scenario', () => {
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Finalize payments on the server');

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');
    getElementByText('Pay').click();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Re-collect CVC sync scenario', () => {
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Recollect a CVC');

    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');
    getTextInputByPlaceholder('CVC').setValue('123');

    getElementByText('Pay Synchronously').click();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
