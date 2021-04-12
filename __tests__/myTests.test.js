describe('Simple App testing', () => {
  beforeEach(() => {
    $('~app-root').waitForDisplayed(30000, false);
  });

  it('Valid Login Test', () => {
    $('~bancontact').click();
    $('~email').waitForDisplayed(11000, false);
    $('~email').setValue('asdasd@wp.pl');

    $('~pay').click();

    driver.pause(5000);

    driver.switchContext(driver.getContexts()[1]);

    $('button*=Authorize').click();

    driver.pause(25000);
  });
});
