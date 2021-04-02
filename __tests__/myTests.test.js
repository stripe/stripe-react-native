describe('Simple App testing', () => {
  // Adding time out to make sure the app is load prior to test is run
  beforeEach(() => {
    // $('~app-root').waitForDisplayed(11000, false);
  });

  it('Valid Login Test', (async) => {
    // eslint-disable-next-line no-undef
    $('~test2').waitForDisplayed({
      timeout: 5000,
      timeoutMsg: 'screen is not shown',
    });
  });
});
