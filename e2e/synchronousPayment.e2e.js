describe('Synchrounous payment flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.sendToHome();
  });

  it('should pay synchronously ', async () => {
    await element(by.text('Card payment without webhooks')).tap();
    await expect(element(by.text('Pay'))).toBeVisible();
    if (device.getPlatform() === 'ios') {
      await element(by.label('card number')).typeText('4242424242424242');
      await element(by.label('expiration date')).typeText('12/22');
      await element(by.label('CVC')).atIndex(0).typeText('123');
    } else {
      await element(by.type('android.widget.EditText'))
        .atIndex(0)
        .typeText('4242424242424242');
      await element(by.type('android.widget.EditText'))
        .atIndex(1)
        .typeText('12/22');
      await element(by.type('android.widget.EditText'))
        .atIndex(2)
        .typeText('123');
    }

    await element(by.text('Pay')).tap();
    await waitFor(element(by.text('Success')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
