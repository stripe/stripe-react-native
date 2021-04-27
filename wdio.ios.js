const config = require('./wdio.conf');

exports.config = {
  ...config,
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.20.2',
      platformVersion: '14.2',
      platformName: 'iOS',
      deviceName: 'iPhone 12',
      app:
        'example/ios/DerivedData/StripeSdkExample/Build/Products/Debug-iphonesimulator/StripeSdkExample.app',
      automationName: 'XCUITest',
    },
  ],
};
