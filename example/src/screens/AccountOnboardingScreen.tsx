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
          const result = await presentAccountOnboardingScreen({
            clientSecret: '',
            stripeAccount: 'acct_1FnKA8GcISz6E1h7',
            liveMode: false,
          });

          console.log('result', result.error);
        }}
        title="Present onboarding screen"
      />
    </PaymentScreen>
  );
}
