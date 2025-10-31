import { ConnectPayments } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';

export default function ConnectPaymentsListScreen() {
  return (
    <ConnectScreen>
      <ConnectPayments />
    </ConnectScreen>
  );
}
