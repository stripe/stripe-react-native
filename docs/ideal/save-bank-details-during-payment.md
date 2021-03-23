# Save bank details during an iDEAL payment

Learn how to save your customer’s IBAN bank details from an iDEAL payment.

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

## 2. Create or retrieve a Customer

## 2. Create a PaymentIntent

## 3. Collect payment method details and mandate acknowledgement

In your app, collect your customer’s full name, email address, and the [name of their bank](https://stripe.com/docs/api/payment_methods/object#payment_method_object-ideal-bank) (e.g., abn_amro).

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();
  const [email, setEmai] = useState();

  const handlePayPress = async () => {
    // ...
  };

  return (
    <Screen>
      <TextInput
        placeholder="Email"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
      <TextInput
        placeholder="Name"
        onChange={(value) => setName(value.nativeEvent.text)}
      />
      <TextInput
        placeholder="Bank name"
        onChange={(value) => setBankName(value.nativeEvent.text)}
      />
    </Screen>
  );
}
```

## 4. Submit the payment to Stripe

Retrieve the client secret from the PaymentIntent you created in step 2 and call `confirmPayment` method. This presents a webview where the customer can complete the payment on their bank’s website or app. Afterwards, the promise will be resolved with the result of the payment.
Ideal opens the return URL with `stripe-redirect/` as the host. For example, if your custom URL scheme is `myapp`, your return URL must be `myapp://safepay/`.

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();
  const [email, setEmai] = useState();

  const handlePayPress = async () => {
    const billingDetails: CreatePaymentMethod.BillingDetails = {
      name,
      email,
    };
  };

  const { error, paymentIntent } = await confirmPayment(clientSecret, {
    type: 'Ideal',
    billingDetails,
    bankName,
  });

  if (error) {
    Alert.alert(`Error code: ${error.code}`, error.message);
  } else if (paymentIntent) {
    Alert.alert(
      'Success',
      `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
    );
  }

  return (
    <Screen>
      <TextInput
        placeholder="Email"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
      <TextInput
        placeholder="Name"
        onChange={(value) => setName(value.nativeEvent.text)}
      />
      <TextInput
        placeholder="Bank name"
        onChange={(value) => setBankName(value.nativeEvent.text)}
      />
    </Screen>
  );
}
```

## 5. Charge the SEPA Direct Debit PaymentMethod later
