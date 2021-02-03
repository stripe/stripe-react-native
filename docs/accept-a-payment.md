# Accept a payment - classic

Collecting payments in your React Native app consists of three steps. Creating an object to track payment on your server, collecting card information in your app, and submitting the payment to Stripe for processing.

Stripe uses this payment object, called a `PaymentIntent`, to track and handle all the states of the payment until it’s completed—even when the bank requires customer intervention, like two-factor authentication.

## Setup Stripe

### Client side

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add stripe-react-native
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

## Create your checkout page

Securely collect card information on the client with `CardField` component.

![CardField component](./assets/card-field-example.gif 'CardField component')

Add `CardField` component to your payment screen. To collect card details you can use `onCardChange` prop and save received data in component state. To set the default value for card `defaultValue` prop can be used.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  // ...

  return (
    <View>
      <CardField
        defaultValue={defaultCard}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
      />
    </View>
  );
}
```

## Create a PaymentIntent

Stripe uses a PaymentIntent object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

### Client side

On the client, request a PaymentIntent from your server and store its client secret. Make this action inside `onPress` handler for the payment button.

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
        items: [{ id: 'id' }],
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
      <CardField
        defaultValue={defaultCard}
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
      />

      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}
```

## Submit the payment to Stripe

When the customer taps the Pay button, confirm the PaymentIntent to complete the payment.

In order to do that you will need card details from component state and client secret from the previous step.
Use `useConfirmPayment` hook from SDK. The hook returns `confirmPayment` method and `loading` value which indicates the state of the async action.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);
  const {confirmPayment, loading} = useConfirmPayment();

  // ...

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      const billingDetails: BillingDetails = {
        email,
      }; // Gather customer billing information (ex. email)

      // Fetch Intent Client Secret from backend
      const clientSecret = await fetchPaymentIntentClientSecret();

      // Confirm payment with card details
      const intent = await confirmPayment(clientSecret, {
        type: 'Card',
        cardDetails: card,
        billingDetails,
      });
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Payment confirmation error', e.code);
    }
  }, [card, fetchPaymentIntentClientSecret]);

  return (
    // ...
  );
}
```

If authentication is required by regulation such as Strong Customer Authentication, the SDK presents additional activities and walks the customer through that process. See Supporting [3D Secure Authentication](./3d-secure.md) to learn more.

The `confirmPayment` function returns a `Promise` that resolves withe the `PaymentIntent` when the payment completes. In case of an error, the `Promise` will reject with an `error` object. Inspect the `code` field on the `error` object to determine the cause.

You can also check the status of a PaymentIntent in the Dashboard or by inspecting the status property on the object.

If you prefer using `onSuccess`/`onError` callbacks instead of the promise returned by `confirmPayment` there is a possibility to pass them as arguments to `useConfirmPayment` hook.

```tsx
const { confirmPayment, loading } = useConfirmPayment({
  onError: (error) => {
    // onError callback
  },
  onSuccess: (intent) => {
    // onSuccess callback
  },
});
```

## Test the integration

By this point you should have a basic card integration that collects card details and makes a payment.

There are several test cards you can use in test mode to make sure this integration is ready. Use them with any CVC and future expiration date.

| NUMBER              | DESCRIPTION                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| 4242 4242 4242 4242 | Succeeds and immediately processes the payment\.                                                |
| 4000 0025 0000 3155 | Requires authentication\. Stripe will trigger a modal asking for the customer to authenticate\. |
| 4000 0000 0000 9995 | Always fails                                                                                    |

For the full list of test cards see our guide on [testing](https://stripe.com/docs/testing).

## Optional - use `useStripe` hook instead of `useConfirmPayment`

You can also use `useStripe` hook to confirm the payment. This hook returns a whole list of stripe methods you can use. The only difference is that you will have to manage `loading` state by yourself and there won't be a possibility to use classic `onSuccess`/`onError` callbacks in addition to promise.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  const {confirmPayment} = useStripe();

  // ...

  const handlePayPress = useCallback(async () => {
    if (!card) {
      return;
    }

    try {
      const billingDetails: BillingDetails = {
        email,
      }; // Gather customer billing information (ex. email)

      // Fetch Intent Client Secret from backend
      const clientSecret = await fetchPaymentIntentClientSecret();

      // Confirm payment with card details
      const intent = await confirmPayment(clientSecret, {
        type: 'Card',
        cardDetails: card,
        billingDetails,
      });
      console.log('Success from promise', intent);
    } catch (e) {
      console.log('Payment confirmation error', e.code);
    }
  }, [card, fetchPaymentIntentClientSecret]);

  return (
    // ...
  );
}
```
