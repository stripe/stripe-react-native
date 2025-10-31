import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';

export default function ConnectAccountOnboardingScreen() {
  return (
    <ConnectScreen>
      <ConnectAccountOnboarding
        onExit={() => {
          console.log('ConnectAccountOnboarding onExit');
        }}
      />
    </ConnectScreen>
  );
}
