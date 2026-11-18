const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const harnessRoot = __dirname;
const repoRoot = path.resolve(harnessRoot, '../..');

// The library lives at the repository root and has its own react and
// react-native copies (nmHoistingLimits: workspaces). Bare specifiers
// imported from repository source (those singletons, and other packages
// such as Babel helpers injected into src/) cannot see the harness
// node_modules, and the repo-root copy is blocklisted. Re-resolve them from
// the harness so the bundle contains exactly one react and react-native.
// Relative and absolute requests stay anchored to the importing file.
const harnessEntry = path.join(harnessRoot, 'index.js');

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isBareSpecifier = (moduleName) =>
  !moduleName.startsWith('.') && !path.isAbsolute(moduleName);

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
      const fromRepositorySource =
        !context.originModulePath.startsWith(harnessRoot);
      if (fromRepositorySource && isBareSpecifier(moduleName)) {
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
