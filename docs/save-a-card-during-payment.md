# Save a card during payment

Use the Payment Intents API to save card details from a purchase. There are several use cases:

- Charge a customer for an e-commerce order and store the details for future purchases
- Initiate the first payment of a series of recurring payments
- Charge a deposit and store the details to charge the full amount later

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

## Create a Customer before payment

To set a card up for future payments, it must be attached to a Customer.

## Create a PaymentIntent

### Client side

On the client, request a PaymentIntent from your server and store its client secret. Make this action inside `onPress` handler for the payment button.

```tsx
function PaymentScreen() {
  // ...

  const fetchPaymentIntentClientSecret = async () => {
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
  };

  const handlePayPress = async () => {
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
  };

  return (
    <View>
      <CardField
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
  const [card, setCard] = useState<CardDetails | null>(null);
  const { confirmPayment, loading } = useConfirmPayment();

  // ...

  const handlePayPress = async () => {
    if (!card) {
      return;
    }

    const billingDetails: BillingDetails = {
      email,
    }; // Gather customer billing information (ex. email)

    // Fetch Intent Client Secret from backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    // Confirm payment with card details
    const { paymentIntent, error } = await confirmPayment(clientSecret, {
      type: 'Card',
      cardDetails: card,
      billingDetails,
      setupFutureUsage: 'OffSession',
    });

    if (error) {
      console.log('Payment confirmation error', e.code);
    } else if (paymentIntent) {
      console.log('Success from promise', paymentIntent);
    }
  };

  return <View />;
}
```

The `setupFutureUsage` parameter helps [optimize future payments](https://stripe.com/docs/payments/payment-intents#future-usage) made with the same card. When both setupFutureUsage and a customer are provided on a PaymentIntent, the payment’s card details are automatically saved to the customer once the payment is confirmed. You can also supply this parameter when creating the PaymentIntent on your server.

Supplying an appropriate `setupFutureUsage` value for your application may require your customer to complete additional authentication steps, but reduces the chance of future payments being rejected by the bank. See [Optimizing cards for future payments](https://stripe.com/docs/payments/payment-intents#future-usage) to determine which value you should use for your application.

| HOW YOU INTEND TO USE THE CARD   | DESCRIPTION |
| -------------------------------- | ----------- |
| On-session payments only         | OnSession   |
| Off-session payments only        | OffSession  |
| Both on and off-session payments | OnSession   |

A card set up for on-session payments can still be used to make off-session payments, but there’s a higher likelihood that the bank will reject the off-session payment and require authentication from the cardholder.

If authentication is required by regulation such as [Strong Customer Authentication](https://stripe.com/docs/strong-customer-authentication), proper handler presents view and walks the customer through that process. See Supporting 3D Secure Authentication on iOS to learn more.

You can also check the status of a PaymentIntent in the Dashboard or by inspecting the status property on the object.

If the payment completed successfully, the payment’s card is saved to the payment’s customer. This is reflected on the PaymentMethod’s customer field. At this point, associate the ID of the Customer object with your own internal representation of a customer, if you have one. Now you can use the stored PaymentMethod object to collect payments from your customer in the future without prompting them for their payment details again.

## Re-collect a CVC

When creating subsequent payments on a saved card, you may want to re-collect the CVC of the card as an additional fraud measure to verify the user.

Start by creating a PaymentIntent from your server with the amount and currency of the payment, and set [customer](https://stripe.com/docs/api/payment_intents#customer) to the ID of your Customer. Then, [list](https://stripe.com/docs/api/payment_methods/list) the PaymentMethods associated with your Customer to determine which PaymentMethods to show to your user for CVC re-collection.

After recollecting the customer’s CVC information, call `confirmPayment` method with the customer’s `CVC` and `paymentMethodId`.

```tsx
const pay = async (cvc: string) => {
  const {
    clientSecret,
    paymentMethodId,
  } = await fetchPaymentIntentClientSecret();

  // 2. Confirm payment with CVC
  // The rest will be done automatically using webhooks
  const { error, paymentIntent } = await confirmPayment(clientSecret, {
    type: 'Card',
    cvc,
    paymentMethodId,
  });

  if (error) {
    Alert.alert(`Error code: ${error.code}`, error.message);
  } else if (paymentIntent) {
    Alert.alert('Success', 'The payment was confirmed successfully!');
  }
};
```

A payment may succeed even with a failed CVC check. If this isn’t what you want, you may want to configure your [Radar rules](https://stripe.com/docs/radar/rules#traditional-bank-checks) to block payments when CVC verification fails.
