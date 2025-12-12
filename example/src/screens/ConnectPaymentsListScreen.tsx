import { ConnectPayments } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';
import { Alert } from 'react-native';

export default function ConnectPaymentsListScreen() {
  return (
    <ConnectScreen>
      <ConnectPayments
        style={{ paddingVertical: 16 }}
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
}
