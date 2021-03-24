# Accept an iDEAL payment

Learn how to accept iDEAL, a common payment method in the Netherlands.

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

### Server side

Stripe uses a PaymentIntent object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

### Client side

On the client, request a PaymentIntent from your server and store its client secret.

```tsx
const fetchPaymentIntentClientSecret = async () => {
  const response = await fetch(`${API_URL}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      currency: 'eur',
      items: [{ id: 'id' }],
      payment_method_types: ['ideal'],
    }),
  });
  const { clientSecret, error } = await response.json();

  return { clientSecret, error };
};
```

## 3. Collect payment method details

In your app, collect your customer’s full name and the name of their bank (e.g., abn_amro).

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();

  const handlePayPress = async () => {
    // ...
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

Ideal opens the return URL with `safepay/` as the host. For example, if your custom URL scheme is `myapp`, your return URL must be `myapp://safepay/`.

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();

  const handlePayPress = async () => {
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name,
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

## 5. Handle deep linking

At first you need to register url schemes for [iOS](https://developer.apple.com/documentation/xcode/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app) and [Android](https://developer.android.com/training/app-links/deep-linking).

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
    handleDeepLink(initialUrl);
  };

  const urlCallback = (event) => {
    handleDeepLink(event.url);
  };

  getUrlAsync();

  Linking.addEventListener('url', urlCallback);
  return () => Linking.removeEventListener('url', urlCallback);
}, []);
```

## 6. Test your integration
