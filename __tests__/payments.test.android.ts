/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import BasicPaymentScreen from './screenObject/BasicPaymentScreen';
import homeScreen from './screenObject/HomeScreen';

// type WDIO = { saveScreen: (name: string) => void } & WebdriverIO.Browser;

describe('Example app payments scenarios (android)', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    // (driver as WDIO).saveScreen(`screen-${new Date().getTime()}`);

    driver.reloadSession();
  });

  it('Bancontact payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact Payment');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Bancontact future payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com', buttonText: 'Save' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('EPS payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('EPS');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Fpx payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('FPX');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });

    getElementByText('Public Bank').click();
    $('//android.widget.TextView[@content-desc="OK"]').click();

    driver.pause(5000);
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('P24 payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Przelewy24');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Giropay payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('giropay');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL payment');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Knab',
    });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL set up payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Knab',
      buttonText: 'Save',
    });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Sofort payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Sofort');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus('Processing');
  });

  it('Sofort set up payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Sofort SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com', buttonText: 'Save' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  // it('Afterpay/Clearpay payment scenario', () => {
  //     homeScreen.goTo('Buy now pay later');
  //     homeScreen.goTo('Afterpay and Clearpay');

  //     BasicPaymentScreen.pay({ email: 'test@stripe.com' });
  //     BasicPaymentScreen.authorize();
  //     BasicPaymentScreen.checkStatus();
  // });

  it('OXXO payment scenario', () => {
    homeScreen.goTo('Vouchers');
    homeScreen.goTo('OXXO');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    driver.back();
    driver.pause(3000);
    driver.switchContext(driver.getContexts()[0]);
    BasicPaymentScreen.checkStatus();
  });

  it('Alipay payment scenario', () => {
    homeScreen.goTo('Wallets');
    homeScreen.goTo('Alipay');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Grabpay payment scenario', () => {
    homeScreen.goTo('Wallets');
    homeScreen.goTo('GrabPay');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Re-collect CVC async scenario', () => {
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Recollect a CVC');

    $('~payment-screen').waitForDisplayed({ timeout: 15000 });

    getTextInputByPlaceholder('E-mail').setValue('test_pm@stripe.com');
    getTextInputByPlaceholder('CVC').setValue('123');

    getElementByText('Pay').click();

    driver.pause(10000);
    driver.back();
    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
