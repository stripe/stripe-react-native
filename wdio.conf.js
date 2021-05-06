module.exports = {
  runner: 'local',
  port: 4723,
  specs: ['./__tests__/*.test.ts'],
  exclude: [],
  maxInstances: 10,
  capabilities: [],
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
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
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
    timeout: 60000,
  },
};
