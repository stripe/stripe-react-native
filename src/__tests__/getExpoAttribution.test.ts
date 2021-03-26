import { getExpoAttribution } from '../helpers';

test('Expo attribution tests', () => {
  const managedPackageJSON = {
    dependencies: {
      'react-native':
        'https://github.com/expo/react-native/archive/sdk-40.0.1.tar.gz',
      'expo': '40.0.0',
    },
  };
  const barePackageJSON = {
    dependencies: {
      expo: '40.0.0',
    },
  };
  const emptyPackageJSON = {};

  expect(getExpoAttribution(managedPackageJSON)).toEqual('expo managed');
  expect(getExpoAttribution(barePackageJSON)).toEqual('expo bare');
  expect(getExpoAttribution(emptyPackageJSON)).toEqual('');
});
