import React from 'react';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

const Root = () => <App />;

AppRegistry.registerComponent(appName, () => Root);
