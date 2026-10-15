import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from '../example/app.json';

// Reuse the native test app while serving the dedicated Identity bundle.
AppRegistry.registerComponent(appName, () => App);
