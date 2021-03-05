# Card payments without bank authentication

## Build a simpler integration, with regional limitations

### How does this integration work?

### How does it compare to the global integration?

Growing or global businesses should use Stripe’s [global integration](https://stripe.com/docs/payments/accept-a-payment) to support bank requests for two-factor authentication and allow customers to pay with more payment methods.

This integration supports businesses accepting only U.S. and Canadian cards. It’s simpler up front, but does not scale to support a global customer base.

Stripe allows you to collect your customer’s card details and charge at a later time. In some regions, like Europe and India, banks often require a second form of authentication to make a purchase, such as entering a code sent to their phone. This decreases conversion if your customer is not actively using your website or application because they are not available to authenticate the purchase.

If you primarily do business in the U.S. and Canada, banks do not require authentication and you can follow this simpler integration. Building this integration means that expanding to other countries or adding other payment methods will require significant changes. Learn how to [save cards that require authentication.](https://stripe.com/docs/payments/save-and-reuse)

## 1. Setup Stripe

### Client side

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

## 2. Collect card details

Securely collect card information on the client with `CardField` component.

![CardField component](./assets/card-field-example.gif 'CardField component')

Add `CardField` component and `Pay` button to your payment screen. To collect card details you can use `onCardChange` prop and keep received data in component state.

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

Run your app, and make sure your checkout page shows the card component and pay button.

Next, use `createPaymentMethod` to create a [PaymentMethod](https://stripe.com/docs/api/payment_methods) when the user taps the pay button. Send the ID of the PaymentMethod to your server.

```tsx
const pay = () => {
  const { paymentMethod, error } = await createPaymentMethod({
    type: 'Card',
    cardDetails: card,
    billingDetails: null,
  });

  if (error) {
    // Handle error
  } else if (paymentMethod) {
    const paymentMethodId = paymentMethod.id;
    // Send paymentMethodId to your server for the next steps
    // ...
  }
};
```

## 3. Make a payment

## 4. Test the integration

## 5. Upgrading your integration to handle card authentication
