/* eslint-disable no-undef */
describe('Simple App testing', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed({ timeout: 30000 });
  });

  it('Bancontact payment scenario', () => {
    if (driver.isAndroid) {
      $('~bancontact-payment').click();
      $('~email').waitForDisplayed({ timeout: 11000 });
      $('~email').setValue('test@stripe.com');

      $('~pay').click();

      driver.pause(5000);

      driver.switchContext(driver.getContexts()[1]);

      $('button*=Authorize').click();
    }
  });

  it('Card payment using webhooks scenario', () => {
    $('~Accept a payment').click();
    $('~e-mail').waitForDisplayed({ timeout: 10000 });
    $('~e-mail').setValue('test@stripe.com');
    $('~card number').setValue('4242424242424242');
    $('~expiration date').setValue('12/22');
    $('~123').setValue('123');
    $('~pay').click();
    $('~OK').waitForDisplayed({ timeout: 15000 });
    $('~OK').click();
    $('~Payment intent status: Succeeded').waitForDisplayed({ timeout: 5000 });
  });
});
