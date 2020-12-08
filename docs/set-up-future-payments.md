# Set up future payments

The Setup Intents API lets you save a customer’s card without an initial payment. This is helpful if you want to onboard customers now, set them up for payments, and charge them in the future when they’re offline.

Use this integration to set up recurring payments or to create one-time payments with a final amount determined later, often after the customer receives your service.

## Setup Stripe

### Client side

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add react-native-stripe-sdk
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application.

```tsx
import { StripeProvider } from 'react-native-stripe-sdk';

function App() {
  return (
    <StripeProvider publishableKey="pk_test_51Ho4m5A51v44wNexXNFEg0MSAjZUzllhhJwiFmAmJ4tzbvsvuEgcMCaPEkgK7RpXO1YI5okHP08IUfJ6YS7ulqzk00O2I0D1rT">
      // Your app code here
    </StripeProvider>
  );
}
```

## Create a Customer before setup

Create a Customer on you server.

## Create a SetupIntent

Create a SetupIntent on you server.

## Collect card details

Securely collect card information on the client with `CardField` component.

![CardField component](./assets/card-field-example.gif 'CardField component')

Add `CardField` component to your payment screen. To collect card details you can use `onCardChange` prop and keep received data in component state. To set the default value for card `defaultValue` prop can be used.

```tsx
function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(defaultCard);

  // ...

  return (
    <View>
      <CardField
        defaultValue={defaultCard}
        onCardChange={(cardDetails) => setCard(cardDetails)}
      />
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
    try {
      const billingDetails: BillingDetails = {
        email,
      }; // Gather customer billing information (ex. email)
      const clientSecret = await createSetupIntentOnBackend(); // Create setup intent on backend
      const intent = await confirmSetupIntent(
        clientSecret,
        card,
        billingDetails
      );
      // ...
    } catch (e) {
      // ...
    }
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

## Test the integration

By this point you should have an integration that:

- Collects and saves card details without charging the customer by using a SetupIntent
- Charges the card off-session and has a recovery flow to handle declines and authentication requests

There are several test cards you can use to make sure this integration is ready for production. Use them with any CVC, postal code, and future expiration date.

| NUMBER              | DESCRIPTION                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| 4242 4242 4242 4242 | Succeeds and immediately processes the payment\.                                                |
| 4000 0025 0000 3155 | Requires authentication\. Stripe will trigger a modal asking for the customer to authenticate\. |
| 4000 0000 0000 9995 | Always fails                                                                                    |

For the full list of test cards see our guide on [testing](https://stripe.com/docs/testing).
