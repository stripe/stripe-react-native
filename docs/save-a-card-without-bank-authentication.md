# Save a card without bank authentication

## Learn how to save card details and charge your customers later.

Stripe allows you to collect your customer’s card details and charge at a later time. In some regions, like Europe and India, banks often require a second form of authentication to make a purchase, such as entering a code sent to their phone. This decreases conversion if your customer is not actively using your website or application because they are not available to authenticate the purchase.

If you primarily do business in the U.S. and Canada, banks do not require authentication and you can follow this simpler integration. Building this integration means that expanding to other countries or adding other payment methods will require significant changes. Learn how to [save cards that require authentication](https://stripe.com/docs/payments/save-and-reuse).

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

## 2. Collect card details

Securely collect card information on the client with `CardField` component provided by the SDK.

![CardField component](./assets/card-field-example.gif 'CardField component')

Pass the card details to `createPaymentMethod` to create a [PaymentMethod](https://stripe.com/docs/api/payment_methods).

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

Send the resulting PaymentMethod ID to your server and follow the remaining steps to save the card to a customer and charge the card in the future.

## 3. Save the card (server)

## 4. Charge the saved card (server)

## 5. Handle any errors (server)

## 6. Test the integration

## 7. (Optional) Re-Collect CVC

When creating subsequent payments on a saved card, you may want to re-collect the CVC of the card as an additional fraud measure to verify the user.

Start by creating a PaymentIntent from your server with the amount and currency of the payment, and set [customer](https://stripe.com/docs/api/payment_intents#customer) to the ID of your Customer. Then, [list](https://stripe.com/docs/api/payment_methods/list) the PaymentMethods associated with your Customer to determine which PaymentMethods to show to your user for CVC re-collection.

After recollecting the customer’s CVC information, call `confirmPayment` method with the customer’s `CVC` and `paymentMethodId`.

```tsx
const pay = async (cvc: string) => {
  const { clientSecret, paymentMethodId } = await fetchPaymentIntent();

  const { error, paymentIntent } = await confirmPayment(clientSecret, {
    type: 'Card',
    cvc,
    paymentMethodId,
  });
  if (error) {
    Alert.alert(`Error code: ${error.code}`, error.message);
  } else if (paymentIntent.status === PaymentIntents.Status.Succeeded) {
    Alert.alert('Success', 'The payment was confirmed successfully!');
  } else {
    // Handle other statuses accordingly
  }
};
```

A payment may succeed even with a failed CVC check. If this isn’t what you want, you may want to configure your [Radar rules](https://stripe.com/docs/radar/rules#traditional-bank-checks) to block payments when CVC verification fails.

## Upgrade your integration to handle card authentication

# Note that this integration declines cards that require authentication during payment. If you start seeing many payments in the Dashboard listed as Failed, then it’s time to [upgrade your integration](./upgrade-to-handle-authentication.md). Stripe’s global integration handles these payments instead of automatically declining.
