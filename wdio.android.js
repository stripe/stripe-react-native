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
  connectionRetryCount: 4,
  services: ['appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 200000,
  },
  specFileRetries: 1,
  specs: ['./e2e/*.test.ts'],
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.22.1',
      platformName: 'Android',
      app: 'example/android/app/build/outputs/apk/release/app-release.apk',
      automationName: 'UiAutomator2',
      ignoreHiddenApiPolicyError: true,
      enableWebviewDetailsCollection: true,
      avdArgs: '-wipe-data',
      autoGrantPermissions: true,
      androidInstallTimeout: 200000,
    },
  ],
  afterTest: function (test, _context, { passed }) {
    if (!passed) {
      driver.saveScreenshot(
        '.tmp/screenshots/' + test.title.replace(/\s+/g, '') + '-android.png'
      );
    }
  },
};
