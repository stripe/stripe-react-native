exports.config = {
  runner: 'local',
  port: 4723,
  specs: ['./__tests__/*.test.ts'],
  exclude: [],
  maxInstances: 10,
  capabilities: [
    // {
    //   maxInstances: 1,
    //   browserName: '',
    //   appiumVersion: '1.20.2',
    //   platformVersion: '11.0',
    //   platformName: 'Android',
    //   deviceName: 'Pixel_2_XL_API_27',
    //   app: 'example/android/app/build/outputs/apk/debug/app-debug.apk',
    //   automationName: 'UiAutomator2',
    //   chromedriverUseSystemExecutable: true,
    // },
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
  autoCompileOpts: {
    autoCompile: true,
    // see https://github.com/TypeStrong/ts-node#cli-and-programmatic-options
    // for all available options
    tsNodeOpts: {
      transpileOnly: true,
      project: 'tsconfig.json',
    },
    // tsconfig-paths is only used if "tsConfigPathsOpts" are provided, if you
    // do please make sure "tsconfig-paths" is installed as dependency
    tsConfigPathsOpts: {
      baseUrl: './',
    },
  },
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 200000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: ['appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
