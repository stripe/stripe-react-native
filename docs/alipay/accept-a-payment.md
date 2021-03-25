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

When you configured deep linking you can follow this example code to handle particular URL's. It should be placed in your App root component.

```tsx
const handleDeppLink = () => {
  if (url && url.includes(`safepay`)) {
    navigation.navigate('PaymentResultScreen');
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

The Stripe React Native SDK specifies `safepay/` as the host for the return URL for bank redirect methods. After the customer completes their payment with Alipay, your app will be opened with `myapp://safepay/` where `myapp` is your custom URL scheme.

## 4. Confirm the payment

When the customer taps to pay with Alipay, confirm the PaymentIntent using `confirmPayment` method. This presents a webview where the customer can complete the payment.

```tsx
export default function PaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();

  const handlePayPress = async () => {
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Alipay',
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
