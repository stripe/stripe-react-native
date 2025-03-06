const { makeMetroConfig } = require('@rnx-kit/metro-config');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const packageJson = require('../package.json');
const path = require('path');

const root = path.resolve(__dirname, '..');

const modules = Object.keys(packageJson.peerDependencies);

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  watchFolders: [root],
  // We need to make sure that only one version is loaded for peerDependencies
  // So we block them at the root, and alias them to the versions in example's node_modules
  resolver: {
    blacklistRE: exclusionList(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});
