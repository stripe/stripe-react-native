import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';

export default function ConnectPayoutsListScreen() {
  return (
    <ConnectScreen>
      <ConnectPayouts />
    </ConnectScreen>
  );
}
