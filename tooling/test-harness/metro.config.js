const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const harnessRoot = __dirname;
const repoRoot = path.resolve(harnessRoot, '../..');

// The library lives at the repository root and has its own react and
// react-native copies (nmHoistingLimits: workspaces). Resolve those from the
// harness so the bundle contains exactly one of each.
const singletons = ['react', 'react-native'];
const harnessEntry = path.join(harnessRoot, 'index.js');

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = mergeConfig(getDefaultConfig(harnessRoot), {
  watchFolders: [repoRoot],
  resolver: {
    blockList: [
      'node_modules',
      'example',
      'example-stripe-connect',
      'android',
      'ios',
      'lib',
      'docs',
      'e2e-tests',
      '.nx',
    ].map((dir) => new RegExp(`^${escape(path.join(repoRoot, dir))}/.*$`)),
    resolveRequest: (context, moduleName, platform) => {
      const isSingleton = singletons.some(
        (name) => moduleName === name || moduleName.startsWith(`${name}/`)
      );
      if (isSingleton && !context.originModulePath.startsWith(harnessRoot)) {
        return context.resolveRequest(
          { ...context, originModulePath: harnessEntry },
          moduleName,
          platform
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
