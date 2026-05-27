const path = require('path');

const project = (() => {
  try {
    const { configureProjects } = require('react-native-test-app');
    return configureProjects({
      android: {
        sourceDir: 'android',
      },
      ios: {
        sourceDir: 'ios',
      },
    });
  } catch (_) {
    return undefined;
  }
})();

const rntPackageRoot = path.join(__dirname, 'rnt-package');

module.exports = {
  ...(project ? { project } : undefined),
  spmModules: [
    {
      name: 'StripeReactNative',
      path: '..',
      packageFile: {
        name: 'StripeReactNative',
        path: '../Package.swift',
      },
      products: ['StripeReactNative', 'StripeReactNativeOnramp'],
    },
  ],
  dependencies: {
    'rnt-package': {
      root: rntPackageRoot,
      platforms: {
        android: {
          sourceDir: path.join(rntPackageRoot, 'android'),
        },
      },
    },
  },
};
