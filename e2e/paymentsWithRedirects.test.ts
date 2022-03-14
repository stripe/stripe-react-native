/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from './helpers';
import BasicPaymentScreen from './screenObject/BasicPaymentScreen';
import homeScreen from './screenObject/HomeScreen';

describe('Payment scenarios with redirects', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('Bancontact payment scenario', function () {
    this.retries(3);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact Payment');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Bancontact future payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Bancontact SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com', buttonText: 'Save' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('EPS payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('EPS');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('FPX payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('FPX');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });

    getElementByText('Public Bank').click();

    // TODO: Enable the following on iOS. Currently, we are stuck in the processing state indefinitely only on Github Actions.
    if (driver.isAndroid) {
      $('//android.widget.TextView[@content-desc="OK"]').click();
      driver.pause(5000);
      BasicPaymentScreen.authorize();
      BasicPaymentScreen.checkStatus();
    }
  });

  it('P24 payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Przelewy24');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Giropay payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('giropay');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize({ elementType: 'a' });
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL payment');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Knab',
    });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('iDEAL set up payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('iDEAL SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      bankName: 'Knab',
      buttonText: 'Save',
    });

    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Sofort payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    homeScreen.goTo('Sofort');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus('Processing');
  });

  it('Sofort set up payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank redirects');
    if (driver.isIOS) {
      driver.execute('mobile: scroll', {
        direction: 'down',
      });
    }
    homeScreen.goTo('Sofort SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com', buttonText: 'Save' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('OXXO payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Vouchers');
    homeScreen.goTo('OXXO');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    driver.pause(3000);
    if (driver.isAndroid) {
      driver.back();
    } else {
      // TODO: File an issue for Appium to support the 'Close' button.
      driver.touchAction({ action: 'tap', x: 20, y: 50 });
    }

    driver.pause(3000);
    driver.switchContext(driver.getContexts()[0]);
    BasicPaymentScreen.checkStatus();
  });

  // TODO: Figure out why the following test executes so slowly
  // it('Alipay payment scenario', function () {
  //   this.retries(2);
  //   homeScreen.goTo('Wallets');
  //   homeScreen.goTo('Alipay');

  //   $('~payment-screen').waitForDisplayed({ timeout: 30000 });

  //   BasicPaymentScreen.pay({ email: 'test@stripe.com' });
  //   BasicPaymentScreen.authorize();
  //   BasicPaymentScreen.checkStatus();
  // });

  it('Grabpay payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Wallets');
    homeScreen.goTo('GrabPay');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize();
    BasicPaymentScreen.checkStatus();
  });

  it('Re-collect CVC async scenario', function () {
    this.retries(2);
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Recollect a CVC');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    getTextInputByPlaceholder('E-mail').setValue('test_pm@stripe.com');
    getTextInputByPlaceholder('CVC').setValue('123');

    getElementByText('Pay').click();

    driver.pause(10000);
    driver.back();
    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 30000,
    });
    expect(alert.getText()).toEqual('Success');
  });
});
