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

The Stripe React Native SDK specifies `safepay/` as the return URL host for bank redirect and wallet payment methods. After the customer completes their payment with Alipay, your app will be opened with `myapp://safepay/` where `myapp` is your custom URL scheme.

To handle deep linking, your app will need to register a custom url scheme. If you're using Expo, [set your scheme](https://docs.expo.io/guides/linking/#in-a-standalone-app) in the `app.json` file.

Otherwise, follow the React Native Linking module [docs](https://reactnative.dev/docs/linking) to configure deep linking. For more information on native URL schemes, refer to the native [Android](https://developer.android.com/training/app-links/deep-linking) and [iOS](https://developer.apple.com/documentation/xcode/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app) docs.

Once your scheme is configured, you can specify a callback to handle the URLs:

```tsx
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from 'stripe-react-native';

import { Linking } from 'react-native';
// For Expo use this import instead:
// import * as Linking from 'expo-linking';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { handleURLCallback } = useStripe();

  const handleDeepLink = async () => {
    if (url && url.includes(`safepay`)) {
      await handleURLCallback(url);
      navigation.navigate('PaymentResultScreen', { url });
    }
  };

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };
    getUrlAsync();

    const urlCallback = (event) => {
      handleDeepLink(event.url);
    };

    Linking.addEventListener('url', urlCallback);
    return () => Linking.removeEventListener('url', urlCallback);
  }, []);

  return <Screen>{/* ... */}</Screen>;
}
```

## 4. Confirm the payment

When the customer taps to pay with Alipay, confirm the PaymentIntent using `confirmPayment` method. This presents a webview where the customer can complete the payment.

```tsx
export default function AlipayPaymentScreen() {
  const [email, setEmail] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();

  const handlePayPress = async () => {
    const { clientSecret } = await fetchPaymentIntentClientSecret();

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'Alipay',
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
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Pay"
        loading={loading}
      />
    </Screen>
  );
}
```

## 5. Handle post-payment events
