# FPX payments

Learn to accept FPX, a common payment method in Malaysia.

## Custom integration

## 1. Setup Stripe

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add stripe-react-native
or
npm install stripe-react-native
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application.

```tsx
import { StripeProvider } from 'stripe-react-native';

function App() {
  return (
    <StripeProvider publishableKey="pk_test_51Ho4m5A51v44wNexXNFEg0MSAjZUzllhhJwiFmAmJ4tzbvsvuEgcMCaPEkgK7RpXO1YI5okHP08IUfJ6YS7ulqzk00O2I0D1rT">
      // Your app code here
    </StripeProvider>
  );
}
```

## 2. Create a PaymentIntent on the server

## 3 Pass the PaymentIntent’s client secret to the client

Stripe uses a PaymentIntent object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

### Client side

On the client, request a PaymentIntent from your server and store its client secret.

```tsx
const [clientSecret, setClientSecret] = useState();

const fetchPaymentIntentClientSecret = async () => {
  const response = await fetch(`${API_URL}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      currency: 'myr',
      items: [{ id: 'id' }],
      payment_method_types: ['fpx'],
    }),
  });
  const { clientSecret, error } = await response.json();

  setClientSecret(clientSecret);
};
```

## 4. Confirm the payment

When the customer taps to pay with FPX, confirm the PaymentIntent using `confirmPayment` method. This presents a bank list and after choosing the one, it will redirect to the payment authentication screens and guide the user to enter their bank account details.

```tsx
export default function PaymentScreen() {
  const handlePayPress = async () => {
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Fpx',
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      Alert.alert(
        'Success',
        `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
      );
    }
  };

  return (
    <Screen>
      <View />
    </Screen>
  );
}
```

## 5. Asynchronously fulfill the customer’s order
