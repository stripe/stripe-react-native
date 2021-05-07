/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import BasicPaymentScreen from './screenObject/BasicPaymentScreen';
import nativeAlert from './screenObject/components/NativeAlert';
import homeScreen from './screenObject/HomeScreen';

describe('Example app payments scenarios (android)', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });
  afterEach(() => {
    // driver.saveScreen(`screen-${new Date().getTime()}`);
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('Bancontact payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact Payment');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Bancontact future payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact SEPA Direct Debit set up');

    BasicPaymentScreen.pay({ email: 'test@stripe.com', buttonText: 'Save' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('EPS payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('EPS');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Fpx payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('FPX');

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

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Giropay payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('giropay');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL payment');

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Revolut',
    });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL set up payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL SEPA Direct Debit set up');

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Revolut',
      buttonText: 'Save',
    });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Sofort payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Sofort');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus('Processing');
  });

  it('Sofort set up payment scenario', () => {
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Sofort SEPA Direct Debit set up');

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

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    driver.back();
    driver.pause(3000);
    driver.switchContext(driver.getContexts()[0]);
    BasicPaymentScreen.checkStatus();
  });

  it('Alipay payment scenario', () => {
    homeScreen.goTo('Wallets');
    homeScreen.goTo('Alipay');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Grabpay payment scenario', () => {
    homeScreen.goTo('Wallets');
    homeScreen.goTo('GrabPay');

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Re-collect CVC async scenario', () => {
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Recollect a CVC');

    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');
    getTextInputByPlaceholder('CVC').setValue('123');

    getElementByText('Pay').click();
    driver.pause(10000);
    driver.back();
    const alert = nativeAlert.getAlertElement('Success');
    alert.waitForDisplayed({
      timeout: 15000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
