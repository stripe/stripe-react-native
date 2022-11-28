/* eslint-disable no-undef */
import {
  getElementByText,
  getTextInputByPlaceholder,
  clickButtonContainingText,
} from './helpers';
import BasicPaymentScreen, {
  getAllWebviewContexts,
  getNativeContext,
} from './screenObject/BasicPaymentScreen';
import cardField from './screenObject/components/CardField';
import homeScreen from './screenObject/HomeScreen';
import BECSForm from './screenObject/components/BECSForm';

describe('Common payment scenarios', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    driver.reloadSession();
  });

  // it('WeChat pay payment scenario', function () {
  //   this.retries(2);
  //   homeScreen.goTo('Wallets');
  //   homeScreen.goTo('WeChat Pay');

  //   $('~payment-screen').waitForDisplayed({ timeout: 30000 });

  //   BasicPaymentScreen.pay({ email: 'test@stripe.com' });

  //   const message = driver.isAndroid
  //     ? 'WeChatPay registerApp fails'
  //     : 'This PaymentIntent action requires an app, but the app is not installed or the request to open the app was denied.';
  //   const alert = getElementByText(message);
  //   alert.waitForDisplayed({
  //     timeout: 10000,
  //   });
  //   expect(alert.getText()).toEqual(message);
  // });

  it('BECS direct payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('BECS Direct Debit payment');

    $('~payment-screen').waitForDisplayed({ timeout: 20000 });

    BECSForm.setName('stripe');
    BECSForm.setEmail('test@stripe.com');
    BECSForm.setBSB('000000');
    BECSForm.setAccountNumber('000123456');

    const button = driver.isAndroid
      ? $(
          `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Pay"))`
        )
      : $(`~Pay`);

    expect(button).toBeDisplayed();
    button.click();

    BasicPaymentScreen.checkStatus('Processing');
  });

  it('BECS direct set up payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('BECS Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BECSForm.setName('stripe');
    BECSForm.setEmail('test@stripe.com');
    BECSForm.setBSB('000000');
    BECSForm.setAccountNumber('000123456');

    const button = driver.isAndroid
      ? $(
          `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Save"))`
        )
      : $(`~Save`);

    expect(button).toBeDisplayed();
    button.click();

    BasicPaymentScreen.checkStatus('Success');
  });

  it('SEPA payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('SEPA Direct Debit payment');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      iban: 'AT611904300234573201',
    });
    BasicPaymentScreen.checkStatus('Processing');
  });

  it('SEPA set up payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('SEPA Direct Debit set up');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({
      email: 'test@stripe.com',
      buttonText: 'Save IBAN',
      iban: 'AT611904300234573201',
    });
    BasicPaymentScreen.checkStatus();
  });

  it('Card payment using webhooks scenario', function () {
    this.retries(2);
    homeScreen.goTo('Accept a payment');
    homeScreen.goTo('Card element only');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');

    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');

    getElementByText('Pay').click();

    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Setup future payment scenario', function () {
    this.retries(2);
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Set up future payments');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    getTextInputByPlaceholder('E-mail').setValue('test@stripe.com');

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');

    getElementByText('Save via card input form').click();
    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Finalize payment on the server scenario', function () {
    this.retries(2);
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Finalize payments on the server');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');

    getElementByText('Pay').click();
    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Re-collect CVC sync scenario', function () {
    this.retries(2);
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Recollect a CVC');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    getTextInputByPlaceholder('E-mail').setValue('test_pm@stripe.com');
    getTextInputByPlaceholder('CVC').setValue('123');

    getElementByText('Pay Synchronously').click();
    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('Create tokens with a bank account and with a card', function () {
    this.retries(1);
    homeScreen.goTo('More payment scenarios');
    homeScreen.goTo('Create tokens');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    getElementByText('Create a PII token').click();
    let alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
    alert.dismissAlert();

    getElementByText('Create a token from a bank account').click();
    alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
    alert.dismissAlert();

    cardField.setCardNumber('4242424242424242');
    cardField.setExpiryDate('12/22');
    cardField.setCvcNumber('123');
    getElementByText('Create a token from a card').click();
    alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    expect(alert.getText()).toEqual('Success');
  });

  it('ACH Payment', function () {
    this.retries(2);

    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('ACH payment');
    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    clickButtonContainingText('Collect bank account');

    authorizeACH();

    let alert = getElementByText('Requires Confirmation');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();

    clickButtonContainingText('Confirm');
    driver.pause(3000);

    alert = getElementByText('Awaiting verification');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();

    getElementByText('Verify microdeposit').click();
    driver.pause(3000);

    alert = getElementByText('Processing');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();
  });

  it('ACH Setup', function () {
    this.retries(2);

    homeScreen.goTo('Bank Debits');
    homeScreen.goTo('ACH setup');
    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    clickButtonContainingText('Collect bank account');

    authorizeACH();

    let alert = getElementByText('Requires Confirmation');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();

    clickButtonContainingText('Confirm');
    driver.pause(3000);

    alert = getElementByText('Awaiting verification');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();

    getElementByText('Verify microdeposit').click();
    driver.pause(3000);

    alert = getElementByText('Succeeded');
    alert.waitForDisplayed({
      timeout: 20000,
    });
    alert.dismissAlert();
  });
});

function authorizeACH() {
  driver.waitUntil(() => getAllWebviewContexts().length > 0, {
    timeout: 10000,
    interval: 1000,
  });
  const webviewContexts = getAllWebviewContexts();
  for (const context of webviewContexts) {
    try {
      driver.switchContext(context);
      let button = $(`button*=Manually verify instead`);
      driver.waitUntil(() => button.isDisplayed(), {
        timeout: 10000,
        interval: 1000,
      });
      if (button.isDisplayed()) {
        button.click();
        driver.pause(2000);

        button = $(`span=Confirm account number`);
        button.click();
        button.sendKeys(['000123456789']);
        driver.pause(500);

        button = $(`span=Account number`);
        button.click();
        button.pressKeyCode;
        button.sendKeys(['000123456789']);
        driver.pause(500);

        button = $(`span=Routing number`);
        button.click();
        button.sendKeys(['110000000']);
        driver.pause(500);

        button = $(`span=Confirm account number`);
        button.click();

        button = $(`button*=Continue`);
        button.click();

        button = $(`//button[@data-testid='done-button']`);
        driver.waitUntil(() => button.isDisplayed(), {
          timeout: 10000,
          interval: 1000,
        });
        button.click();

        break;
      }
    } catch (e) {
      console.log(
        `Unable to switch to ${context} context. This context may no longer exist.`
      );
    }
  }
  driver.switchContext(getNativeContext());
  driver.pause(5000);
}
