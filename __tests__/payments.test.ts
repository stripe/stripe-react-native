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

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('Bancontact future payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Bancontact SEPA Direct Debit set up');

      BasicPaymentScreen.pay({ email: 'test@stripe.com', payButton: 'Save' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('EPS payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('EPS');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('Fpx payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('FPX');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });

      getElementByText('Public Bank').click();
      driver.pause(5000);
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('P24 payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Przelewy24');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('Giropay payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('giropay');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('iDEAL payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('iDEAL payment');

      BasicPaymentScreen.pay({ email: 'test@stripe.com', bankName: 'revolut' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('iDEAL set up payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('iDEAL SEPA Direct Debit set up');

      BasicPaymentScreen.pay({
        email: 'test@stripe.com',
        bankName: 'revolut',
        payButton: 'Save',
      });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('Sofort payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Sofort');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('Sofort set up payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Bank redirects');
      homeScreen.goTo('Sofort SEPA Direct Debit set up');

      BasicPaymentScreen.pay({ email: 'test@stripe.com', payButton: 'Save' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
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
      payButton: 'Save IBAN',
      iban: 'AT611904300234573201',
    });
    BasicPaymentScreen.checkStatus();
  });

  it('Afterpay/Clearpay payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Buy now pay later');
      homeScreen.goTo('Afterpay and Clearpay');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('OXXO payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Vouchers');
      homeScreen.goTo('OXXO');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      driver.back();
      driver.pause(3000);
      driver.switchContext(driver.getContexts()[0]);
      BasicPaymentScreen.checkStatus();
    }
  });

  it.only('Alipay payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Wallets');
      homeScreen.goTo('Alipay');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it.only('Grabpay payment scenario', () => {
    // webview handling
    if (driver.isAndroid) {
      homeScreen.goTo('Wallets');
      homeScreen.goTo('GrabPay');

      BasicPaymentScreen.pay({ email: 'test@stripe.com' });
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
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
