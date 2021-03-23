# Accept an Alipay payment

Use the Stripe APIs or Checkout to accept Alipay, a digital wallet popular with customers from China.

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

## 2. Create a PaymentIntent

## 3. Redirect to the Alipay Wallet

At first you need to register url schemes for [iOS](https://developer.apple.com/documentation/xcode/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app) and [Android](https://developer.android.com/training/app-links/deep-linking).

Next, Follow [Linking](https://reactnative.dev/docs/linking) module documentation to configure and enable handling deep links in your app.

```tsx
const handleDeppLink = (url) => {
  if (url && url.includes(`stripe-example://safepay`)) {
    // redirect to proper screen
  }
};

useEffect(() => {
  const getUrlAsync = async () => {
    const initialUrl = await Linking.getInitialURL();
    handleDeppLink(initialUrl);
  };

  const urlCallback = (event) => {
    handleDeppLink(event.url);
  };

  getUrlAsync();

  Linking.addEventListener('url', urlCallback);
  return () => Linking.removeEventListener('url', urlCallback);
}, []);
```

Alipay opens the return URL with safepay/ as the host. For example, if your custom URL scheme is `myapp`, your return URL must be `myapp://safepay/`.

## 4. Confirm the payment

When the customer taps to pay with Alipay, confirm the PaymentIntent using `confirmPayment` method. This method will either open up the Alipay app, or display a webview if the Alipay app is not installed.
You can also force displaying webview by passing `webview = true`.

```tsx
export default function PaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();

  const handlePayPress = async () => {
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Alipay',
      bankName,
      webview: true, // force displaying webview
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

```tsx
export default function PaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();

  const handlePayPress = async () => {
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
  };

  return (
    <Screen>
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

## 5. Handle post-payment events
