import { useStripe } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function AccountOnboardingScreen() {
  const { presentAccountOnboardingScreen } = useStripe();
  return (
    <PaymentScreen>
      <Button
        variant="primary"
        onPress={() => {
          presentAccountOnboardingScreen({});
        }}
        title="Present onboarding screen"
      />
    </PaymentScreen>
  );
}
