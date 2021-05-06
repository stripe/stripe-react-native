const config = require('./wdio.conf');

exports.config = {
  ...config,
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.20.2',
      platformVersion: '',
      platformName: 'Android',
      deviceName: 'sdk_gphone_x86_arm',
      app: 'example/android/app/build/outputs/apk/debug/app-debug.apk',
      automationName: 'UiAutomator2',
      chromedriverUseSystemExecutable: true,
    },
  ],
};
