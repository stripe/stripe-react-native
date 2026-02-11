const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the parent directory for the linked @stripe/stripe-react-native package
const parentDir = path.resolve(__dirname, '..');

config.watchFolders = [parentDir];

// Exclude React, React Native, and react-native-webview from the parent's node_modules
// to prevent multiple instances
const parentReact = path.resolve(parentDir, 'node_modules/react');
const parentRN = path.resolve(parentDir, 'node_modules/react-native');
const parentWebView = path.resolve(
  parentDir,
  'node_modules/react-native-webview'
);

config.resolver.blockList = [
  new RegExp(`${parentReact.replace(/[/\\]/g, '[/\\\\]')}/.*`),
  new RegExp(`${parentRN.replace(/[/\\]/g, '[/\\\\]')}/.*`),
  new RegExp(`${parentWebView.replace(/[/\\]/g, '[/\\\\]')}/.*`),
];

// Ensure React, React Native, and react-native-webview are resolved from this app's node_modules only
config.resolver.extraNodeModules = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react-native-webview': path.resolve(
    __dirname,
    'node_modules/react-native-webview'
  ),
};

// Add woff2 as a recognized asset extension
config.resolver.assetExts = [...config.resolver.assetExts, 'woff2'];

module.exports = config;
