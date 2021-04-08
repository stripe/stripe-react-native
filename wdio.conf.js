exports.config = {
  runner: 'local',
  port: 4723,
  specs: ['./__tests__/*.test.js'],
  exclude: [],

  maxInstances: 10,
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.13.0',
      platformName: 'Android',
      deviceName: 'Pixel_3a_API_30_x86',
      app: 'example/android/app/build/outputs/apk/debug/app-debug.apk',
      automationName: 'UiAutomator2',
    },
  ],
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: ['chromedriver', 'appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
