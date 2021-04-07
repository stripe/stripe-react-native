# Bancontact payments

Learn how to accept Bancontact, a common payment method in Belgium.

## 1. Setup Stripe

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

In your app, collect your customer’s full name and email address.

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [email, setEmail] = useState();

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
        placeholder="E-mail"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
    </Screen>
  );
}
```

## 4. Submit the payment to Stripe

Retrieve the client secret from the PaymentIntent you created in step 2 and call `confirmPayment` method. This presents a webview where the customer can complete the payment on their bank’s website or app. Afterwards, the promise will be resolved with the result of the payment.

The Stripe React Native SDK specifies `safepay/` as the host for the return URL for bank redirect methods. After the customer completes their payment with Bancontact, your app will be opened with `myapp://safepay/` where `myapp` is your custom URL scheme.

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [email, setEmail] = useState();

  const handlePayPress = async () => {
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name,
      email,
    };
  };

  const { error, paymentIntent } = await confirmPayment(clientSecret, {
    type: 'Bancontact',
    billingDetails,
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
        placeholder="E-mail"
        onChange={(value) => setEmail(value.nativeEvent.text)}
      />
    </Screen>
  );
}
```

## 5. Handle deep linking

To handle deep linking for bank redirect and wallet payment methods, your app will need to register a custom url scheme. If you're using Expo, [set your scheme](https://docs.expo.io/guides/linking/#in-a-standalone-app) in the `app.json` file.

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

## 6. Handle post-payment events
