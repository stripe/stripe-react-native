import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';
import { Alert } from 'react-native';

export default function ConnectAccountOnboardingScreen() {
  return (
    <ConnectScreen>
      <ConnectAccountOnboarding
        style={{ paddingVertical: 16 }}
        onExit={() => {
          console.log('ConnectAccountOnboarding onExit');
        }}
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
}
