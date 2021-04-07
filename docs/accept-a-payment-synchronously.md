# Finalize payments on the server

## Learn how to confirm a payment on your server and handle card authentication requests.

For a wider range of support and future proofing, use our [standard integration](https://stripe.com/docs/payments/accept-a-payment) for asynchronous payments.

This guide lets you use a single client-to-server flow to take payments, without using webhooks or processing offline events. While it may seem simpler, this integration will be difficult to scale as your business grows. Synchronous payment flows have several limitations:

- Only supports cards: You’ll have to write more code to support ACH and popular regional payment methods separately.
- Double-charge risk: By synchronously creating a new PaymentIntent each time your customer attempts to pay, you risk accidentally double-charging your customer. Be sure to follow best practices.
- Manual authentication handling: If your customer has a card with 3D Secure or is subject to regulations like Strong Customer Authentication, extra steps on the the client are required. If you don’t mind these limitations, feel free to integrate. Otherwise, use the [standard integration](https://stripe.com/docs/payments/accept-a-payment).

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

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application or `initStripe` method alternatively.

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

Add `CardField` component to your payment screen. To collect card details you can use `onCardChange` prop and save received data in component state.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);

  // ...

  return (
    <View>
      <CardField
        onCardChange={(cardDetails) => {
          setCard(cardDetails);
        }}
      />
    </View>
  );
}
```

## Create PaymentMethod

When your customer is ready to check out, create a [PaymentMethod](https://stripe.com/docs/api/payment_methods) with the details collected by the card element.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);
  const { createPaymentMethod } = useStripe();

  const pay = () => {
    if (!card) {
      return;
    }

    // 1. Gather customer billing information (ex. email)
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      email: 'email@stripe.com',
      phone: '+48888000888',
      addressCity: 'Houston',
      addressCountry: 'US',
      addressLine1: '1459  Circle Drive',
      addressLine2: 'Texas',
      addressPostalCode: '77063',
    };

    // 2. Create payment method
    const { paymentMethod, error } = await createPaymentMethod({
      type: 'Card',
      cardDetails: card,
      billingDetails,
    });
  };

  // ...
}
```

## Create PaymentIntent

Stripe uses a `PaymentIntent` object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

Request a `PaymentIntent` from your server. This example passes the server a list of items to determine the price. Always decide how much to charge on the server side, a trusted environment, as opposed to the client. This prevents malicious customers from being able to choose their own prices.

```tsx
// ...
const pay = () => {
  // ...

  // 3. call API to create PaymentIntent
  const {
    clientSecret,
    error,
    requiresAction,
  } = await callNoWebhookPayEndpoint({
    useStripeSdk: true,
    paymentMethodId: paymentMethod.id,
    currency: 'usd',
    items: [
      { id: '1', price: 20 },
      { id: '2', price: 150 },
    ],
  });

  if (error) {
    // Error during creating or confirming Intent
    Alert.alert('Error', paymentIntentError);
    return;
  }

  if (clientSecret && !requiresAction) {
    // Payment succedeed
    Alert.alert('Success', 'The payment was confirmed successfully!');
  }

  if (clientSecret && requiresAction) {
    // ...continued in the next step
  }
};

// ...
```

## Handle any next actions

Write code to handle situations that require your customer to intervene. A normal payment succeeds after you confirm it on the server in [step 4](#create-paymentintent). However, when the PaymentIntent requires additional action from the customer, such as authenticating with [3D Secure](https://stripe.com/docs/payments/3d-secure), this code comes into play.

In these cases, the PaymentIntent’s status is set to requires_action. On the client, pass the PaymentIntent ID to [handleCardAction](./api-reference/modules#useStripe). Native handler presents view and walks the customer through authentication.

After handling required actions on the client, the status of the PaymentIntent changes to `requires_confirmation`. This step enables your integration to synchronously fulfill the order on your backend and return the fulfillment result to your client.

Send the PaymentIntent ID to your backend and confirm it again within one hour to finalize the payment. Otherwise, the payment attempt fails and transitions back to `requires_payment_method`.

```tsx
// ...
const pay = () => {
  // ...

  // 4. if payment requires action calling handleCardAction
  if (clientSecret && requiresAction) {
    const { error, paymentIntent } = await handleCardAction(clientSecret);

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent.status === PaymentIntents.Status.Succeeded) {
      // Payment succedeed
      Alert.alert('Success', 'The payment was confirmed successfully!');
    }
  }
};

// ...
```

## Test the integration

By this point you should have a basic card integration that collects card details and makes a payment.

There are several test cards you can use in test mode to make sure this integration is ready. Use them with any CVC and future expiration date.

```
| 4242424242424242 | Succeeds and immediately processes the payment.                                           |
| 4000002500003155 | Requires authentication. Stripe triggers a modal asking for the customer to authenticate. |
| 4000000000009995 | Always fails with a decline code of `insufficient_funds`.                                 |
```

For the full list of test cards see our guide on [testing](https://stripe.com/docs/testing).

## (Optional) Re-Collect CVC

When creating subsequent payments on a saved card, you may want to re-collect the CVC of the card as an additional fraud measure to verify the user.

Start by [listing](https://stripe.com/docs/api/payment_methods/list) the PaymentMethods associated with your Customer to determine which PaymentMethods to show to your user for CVC re-collection.

After recollecting the customer’s CVC information, tokenize the CVC data using createTokenForCVCUpdate.

```tsx
function PaymentScreen() {
  // ...
  const { createTokenForCVCUpdate } = useStripe();

  const tokenizeCVC = async () => {
    const { error, tokenId } = await createTokenForCVCUpdate();

    if (error) {
      // handle error
    } else if (tokenId) {
      // pass the token ID to your backend
    }
  };
}
```

After sending the CVC token to your server, you’re ready to accept a payment. Create a PaymentIntent from your server with the amount and currency of the payment, and set the required fields. Pass the CVC token in the `payment_method_options[card][cvc_token]` field.
