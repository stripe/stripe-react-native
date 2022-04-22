/* eslint-disable no-undef */
import BasicPaymentScreen, {
  getAllWebviewContexts,
} from './screenObject/BasicPaymentScreen';
import homeScreen from './screenObject/HomeScreen';

describe('Payment scenarios with redirects', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  afterEach(() => {
    driver.reloadSession();
  });

  it('Afterpay/Clearpay payment scenario', function () {
    this.retries(3);

    homeScreen.goTo('Buy now pay later');
    homeScreen.goTo('Afterpay and Clearpay');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    BasicPaymentScreen.authorize({ elementType: 'a', pause: 10000 });
    BasicPaymentScreen.checkStatus();
  });

  it('Opens Klarna webview', function () {
    this.retries(3);

    homeScreen.goTo('Buy now pay later');
    homeScreen.goTo('Klarna');

    $('~payment-screen').waitForDisplayed({ timeout: 30000 });

    BasicPaymentScreen.pay({ email: 'test@stripe.com' });
    driver.pause(10000);
    const webviewContexts = getAllWebviewContexts();
    expect(webviewContexts.length).toBeGreaterThan(0);
  });
});
