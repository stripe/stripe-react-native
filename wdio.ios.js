/* eslint-disable no-undef */
// TODO: extend common config - need to figure out why it doesn't work on CI for now
// const config = require('./wdio.conf');

exports.config = {
  runner: 'local',
  port: 4723,
  exclude: [],
  maxInstances: 10,
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: 'tsconfig.json',
    },
    tsConfigPathsOpts: {
      baseUrl: './',
    },
  },
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 8000,
  connectionRetryTimeout: 200000,
  connectionRetryCount: 3,
  services: ['appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 200000,
  },
  specs: ['./e2e/*.test.ts'],
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.22.1',
      platformName: 'ios',
      deviceName: 'iPhone 12',
      app: 'example/ios/DerivedData/StripeSdkExample/Build/Products/Release-iphonesimulator/StripeSdkExample.app',
      automationName: 'XCUITest',
      nativeWebTap: true,
    },
  ],
  afterTest: function (test, _context, { passed }) {
    if (!passed) {
      driver.saveScreenshot(
        '.tmp/screenshots/' + test.title.replace(/\s+/g, '') + '-ios.png'
      );
    }
  },
};
