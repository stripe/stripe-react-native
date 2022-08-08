/* eslint-disable no-undef */
import {
  getAllWebviewContexts,
  getNativeContext,
} from './screenObject/BasicPaymentScreen';
import { clickButtonContainingText, getElementByText } from './helpers';
import homeScreen from './screenObject/HomeScreen';

describe('Financial Connections', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('Collect bank account session', function () {
    this.retries(3);

    homeScreen.goTo('Financial Connections');
    homeScreen.goTo('Collect Bank Account');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    driver.pause(4000);
    clickButtonContainingText('Collect session');
    authorizeBankAccount();

    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
  });

  it('Collect bank account token', function () {
    this.retries(3);

    homeScreen.goTo('Financial Connections');
    homeScreen.goTo('Collect Bank Account');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    driver.pause(4000);
    clickButtonContainingText('Collect token');
    authorizeBankAccount();

    const alert = getElementByText('Success');
    alert.waitForDisplayed({
      timeout: 20000,
    });
  });
});

function authorizeBankAccount() {
  driver.pause(5000);
  const webviewContexts = getAllWebviewContexts();
  for (const context of webviewContexts) {
    try {
      driver.switchContext(context);
      let button = $(`button*=Enter account details manually instead`);
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
