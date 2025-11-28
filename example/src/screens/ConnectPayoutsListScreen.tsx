import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';
import { Alert } from 'react-native';

export default function ConnectPayoutsListScreen() {
  return (
    <ConnectScreen>
      <ConnectPayouts
        style={{ paddingVertical: 16 }}
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
}
