# Set up future payments

The Setup Intents API lets you save a customer’s card without an initial payment. This is helpful if you want to onboard customers now, set them up for payments, and charge them in the future when they’re offline.

Use this integration to set up recurring payments or to create one-time payments with a final amount determined later, often after the customer receives your service.

## Setup Stripe

### Client side

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add stripe-react-native
or
npm install stripe-react-native
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application or `initialise` method alternatively.

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

## Create a Customer before setup

Create a Customer on your server.

## Create a SetupIntent

Create a SetupIntent on your server.

## Collect card details

Securely collect card information on the client with `CardField` component.

![CardField component](./assets/card-field-example.gif 'CardField component')

Add `CardField` component to your payment screen. To collect card details you can use `onCardChange` prop and keep received data in component state.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);

  // ...

  return (
    <View>
      <CardField onCardChange={(cardDetails) => setCard(cardDetails)} />
    </View>
  );
}
```

To complete the setup, pass the card and billing details objects to the confirmSetupIntent. You can get access to this method using `useConfirmSetupIntent` or `useStripe` hooks.

```tsx
function PaymentScreen() {
  // ...

  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  // ...

  const handlePayPress = async () => {
    const billingDetails: BillingDetails = {
      email,
    }; // Gather customer billing information (ex. email)
    const clientSecret = await createSetupIntentOnBackend(); // Create setup intent on backend
    const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
      type: 'Card',
      cardDetails: card,
      billingDetails,
    });

    if (error) {
      //handle error
    }
    // ...
  };

  return (
    <View>
      // ...
      <Button onPress={handlePayPress} title="Save" loading={loading} />
    </View>
  );
}
```

## Charge the saved card later

Charge the card on your server.

## Start a recovery flow

If the PaymentIntent has any other status, the payment did not succeed and the request fails. Notify your customer to return to your application (e.g., by email, text, push notification) to complete the payment. We recommend creating a recovery flow in your app that shows why the payment failed initially and lets your customer retry.

In your recovery flow, retrieve the PaymentIntent via its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret). Check the PaymentIntent’s `lastPaymentError` to inspect why the payment attempt failed. For card errors, you can show the user the last payment error’s [message](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-last_payment_error-message). Otherwise, you can show a generic failure message.

```tsx
function PaymentScreen() {
  // ...

  const { retrievePaymentIntent } = useStripe();

  // ...

  const handleRecoveryFlow = async () => {
    const { paymentIntent, error } = await retrievePaymentIntent(clientSecret);

    if (error) {
      Alert.alert(`Error: ${error.code}`, error.message);
    } else if (paymentIntent) {
      const failureReason = 'Payment failed, try again.'; // Default to a generic error message
      if (paymentIntent.lastPaymentError.type === 'Card') {
        failureReason = paymentIntent.lastPaymentError.message;
      }
    }
  };

  return (
    <View>
      // ...
      <Button
        onPress={handleRecoveryFlow}
        title="Recovery flow"
        loading={loading}
      />
    </View>
  );
}
```

## Let your customer try again

Give the customer the option to [update](https://stripe.com/docs/api/payment_methods/update) or [remove](https://stripe.com/docs/api/payment_methods/detach) their saved card and try payment again in your recovery flow. Follow the same steps you did to accept their initial payment with one difference—confirm the original, failed PaymentIntent by reusing its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret) instead of creating a new one.

If the payment failed because it requires authentication, try again with the existing PaymentMethod instead of creating a new one.

```tsx
function PaymentScreen() {
  // ...

  const { retrievePaymentIntent } = useStripe();

  // ...

  const handleRecoveryFlow = async () => {
    const { paymentIntent, error } = await retrievePaymentIntent(clientSecret);

    if (error) {
      Alert.alert(`Error: ${error.code}`, error.message);
    } else if (paymentIntent) {
      let failureReason = 'Payment failed, try again.'; // Default to a generic error message
      if (paymentIntent.lastPaymentError.type === 'Card') {
        failureReason = paymentIntent.lastPaymentError.message;
      }

      // If the last payment error is authentication_required allow customer to complete the payment without asking your customers to re-enter their details.
      if (paymentIntent.lastPaymentError?.code === 'authentication_required') {
        // Allow to complete the payment with the existing PaymentMethod.
        const { error } = await confirmPayment(paymentIntent.clientSecret, {
          type: 'Card',
          billingDetails,
          paymentMethodId: paymentIntent.lastPaymentError?.paymentMethod.id,
        });

        if (error) {
          // handle error
        }
      } else {
        // Collect a new PaymentMethod from the customer...
      }
    }
  };

  return (
    <View>
      // ...
      <Button
        onPress={handleRecoveryFlow}
        title="Recovery flow"
        loading={loading}
      />
    </View>
  );
}
```

## Test the integration

By this point you should have an integration that:

- Collects and saves card details without charging the customer by using a SetupIntent
- Charges the card off-session and has a recovery flow to handle declines and authentication requests

There are several test cards you can use to make sure this integration is ready for production. Use them with any CVC, postal code, and future expiration date.

| NUMBER              | DESCRIPTION                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4242 4242 4242 4242 | Succeeds and immediately processes the payment\.                                                                                                                    |
| 4000 0027 6000 3184 | Requires authentication for the initial purchase, and fails for subsequent\.payments (including off-session ones) with an authentication_required\. decline code.\. |
| 4000 0082 6000 3178 | Requires authentication for the initial purchase, but fails for subsequent payments (including off-session ones) with an insufficient_funds decline code.\.         |
| 4000 0025 0000 3155 | Requires authentication\. Stripe will trigger a modal asking for the customer to authenticate\.                                                                     |
| 4000 0000 0000 9995 | Always fails                                                                                                                                                        |

For the full list of test cards see our guide on [testing](https://stripe.com/docs/testing).
