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
  services: [
    'appium',
    [
      'native-app-compare',
      {
        baselineFolder: 'test/baseline',
        formatImageName: '{tag}-{logName}-{width}x{height}',
        screenshotPath: '.tmp/',
        savePerInstance: true,
        autoSaveBaseline: true,
        blockOutStatusBar: true,
        blockOutToolBar: true,
        isHybridApp: true,
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 200000,
  },
  specFileRetries: 1,
  specs: ['./e2e/*.test.android.ts', './e2e/*.test.ts'],
  capabilities: [
    {
      maxInstances: 1,
      browserName: '',
      appiumVersion: '1.21.0',
      platformVersion: '',
      platformName: 'Android',
      deviceName: '',
      app: 'example/android/app/build/outputs/apk/release/app-release.apk',
      automationName: 'UiAutomator2',
      chromedriverUseSystemExecutable: true,
      ignoreHiddenApiPolicyError: true,
      noReset: true,
      enableWebviewDetailsCollection: true,
    },
  ],
};
