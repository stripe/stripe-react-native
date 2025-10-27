import { useStripe } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function AccountOnboardingScreen() {
  const { presentAccountOnboardingScreen } = useStripe();
  return (
    <PaymentScreen>
      <Button
        variant="primary"
        onPress={async () => {
          const result = await presentAccountOnboardingScreen({});

          console.log('result', result.error);
        }}
        title="Present onboarding screen"
      />
    </PaymentScreen>
  );
}
