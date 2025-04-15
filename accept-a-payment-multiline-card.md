# Accept a payment - classic

Collecting payments in your React Native app consists of three steps. Creating an object to track payment on your server, collecting card information in your app, and submitting the payment to Stripe for processing.

Stripe uses this payment object, called a `PaymentIntent`, to track and handle all the states of the payment until it’s completed—even when the bank requires customer intervention, like two-factor authentication.

## Setup Stripe

### Client side

The [React Native SDK](https://github.com/stripe/stripe-react-native) is open source and fully documented. Internally, it makes use of [native iOS](https://github.com/stripe/stripe-ios) and [Android](https://github.com/stripe/stripe-android) SDKs. Install the SDK by running:

```sh
yarn add react-native-stripe-sdk
```

For iOS, run `pod install` in the `ios` directory to ensure that you also install the required native dependencies. Android doesn’t require any additional steps.

When your app starts, configure the SDK with your Stripe [publishable key](https://stripe.com/dashboard.stripe.com/account/apikeys) so it can make requests to the Stripe API:

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51AROWSJX9HHJ5bycpEUP9dK39tXufyuWogSUdeweyZEXy3LC7M8yc5d9NlQ96fRCVL0BlAu7Nqt4V7N5xZjJnrkp005fDiTMIr"
      urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
      merchantIdentifier="merchant.com.{{YOUR_APP_NAME}}" // required for Apple Pay
    >
      // Your app code here
    </StripeProvider>
  );
}
```

## Create your checkout page

Securely collect card information on the client with `CardForm` component.

Add `CardForm` component to your payment screen. To collect card details you can use `onFormComplete` prop and save received data in component state..

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardFormView.Details>();

  // ...

  return (
    <View>
      <CardForm
        cardStyle={{
          backgroundColor: '#FFFFFF',
        }}
        style={{
          width: '100%',
          height: 300,
        }}
        onFormComplete={(cardDetails) => {
          setCard(cardDetails);
        }}
      />
    </View>
  );
}
```

## Create a PaymentIntent

Stripe uses a [PaymentIntent](https://stripe.com/docs/api/payment_intents) object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

### Client side

On the client, request a PaymentIntent from your server and store its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret):

```tsx
function PaymentScreen() {
  // ...

  const fetchPaymentIntentClientSecret = useCallback(async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: ['id-1'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      // Fetch Intent Client Secret from backend
      const clientSecret = await fetchPaymentIntentClientSecret();

      // ...
    } catch (e) {
      // ...
    }
  }, [card, fetchPaymentIntentClientSecret]);

  return (
    <View>
      <CardForm
        onFormComplete={(cardDetails) => {
          setCardDetails(cardDetails);
        }}
      />

      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}
```

## Submit the payment to Stripe

When the customer taps **Pay**, confirm the `PaymentIntent` to complete the payment.

Rather than sending the entire PaymentIntent object to the client, use its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret). This is different from your API keys that authenticate Stripe API requests. The client secret should be handled carefully because it can complete the charge. Don’t log it, embed it in URLs, or expose it to anyone but the customer.

Pass the customer card details and client secret to `confirmPayment`, which you can access with the `useConfirmPayment` hook. The hook also returns a loading value to indicate the state of the asynchronous action:

```tsx
function PaymentScreen() {
  const { confirmPayment, loading } = useConfirmPayment();

  // ...

  const handlePayPress = async () => {
    // Gather the customer's billing information (e.g., email)
    const billingDetails: BillingDetails = {
      email: 'jenny.rosen@example.com',
    };

    // Fetch the intent client secret from the backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    // Confirm the payment with the card details
    const { paymentIntent, error } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: {
        billingDetails,
      },
    });

    if (error) {
      console.log('Payment confirmation error', error);
    } else if (paymentIntent) {
      console.log('Success from promise', paymentIntent);
    }
  };

  return <View />;
}
```

If authentication is required by regulation (e.g., Strong Customer Authentication), additional actions are presented to the customer to complete the payment process. See [Card authentication and 3D Secure](https://stripe.com/docs/payments/3d-secure) for more details.

When the payment completes successfully, the value of the returned PaymentIntent’s `status` property is `succeeded`. Check the status of a PaymentIntent in the [Dashboard](https://dashboard.stripe.com/test/payments) or by inspecting the `status` property on the object. If the payment isn’t successful, inspect the returned `error` to determine the cause.

## Test the integration
