# Accept a WeChat Pay payment

## Use the Payment Intents and Payment Methods APIs to accept WeChat Pay, a digital wallet popular with customers from China.

## iOS

The Stripe [React Native SDK](https://github.com/stripe/stripe-react-native) for iOS natively supports WeChat In-App Payments, without the need to install a 3rd party SDK. It redirects your customer to their WeChat app to make payments, which then redirects the user back to your app when they’re done.

## Android

The Stripe [React Native SDK](https://github.com/stripe/stripe-react-native) for Android supports WeChat In-App Payments via the WeChat SDK for Android. The WeChat SDK launches the user’s WeChat app and prompts them to make a payment, then redirects back to your app when they’re done.

# Set up your integration

The [React Native SDK](https://github.com/stripe/stripe-react-native) is open source and fully documented. Internally, it makes use of [native iOS](https://github.com/stripe/stripe-ios) and [Android](https://github.com/stripe/stripe-android) SDKs. Install the SDK by running:

```sh
yarn add react-native-stripe-sdk
```

For iOS, run `pod install` in the `ios` directory to ensure that you also install the required native dependencies. Android doesn’t require any additional steps.

When your app starts, configure the SDK with your Stripe [publishable key](https://stripe.com/dashboard.stripe.com/account/apikeys) so it can make requests to the Stripe API:

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51AROWSJX9HHJ5bycpEUP9dK39tXufyuWogSUdeweyZEXy3LC7M8yc5d9NlQ96fRCVL0BlAu7Nqt4V7N5xZjJnrkp005fDiTMIr"
      urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
      merchantIdentifier="merchant.com.{{YOUR_APP_NAME}}" // required for Apple Pay
    >
      // Your app code here
    </StripeProvider>
  );
}
```

Before you begin, activate WeChat Pay in the [Dashboard](https://dashboard.stripe.com/account/payments/settings).

Next, get the App ID of your app when you registered with the WeChat open platform account. The App ID is a string that begins with `wx` (e.g., `wx65907d6307c3827d`). [Contact Stripe](https://support.stripe.com/contact) with your App ID to set your app up to process WeChat payments.

## **WeChat SDK Integration**

### Android

In `app/build.gradle`, add these dependencies:

```tsx
implementation 'com.stripe:stripe-wechatpay:$stripe_sdk_version' // WeChat Pay module
// WeChat Pay SDK, make sure 6.7.0 is used
implementation 'com.tencent.mm.opensdk:wechat-sdk-android-without-mta:6.7.0'
```

### iOS

**Register your custom URL scheme**

The WeChat app redirects your customer back to your app when they finish paying, using a [custom URL scheme](https://developer.apple.com/documentation/uikit/inter-process_communication/allowing_apps_and_websites_to_link_to_your_content/) that matches your WeChat App ID. This URL looks like `wxa0df51ec63e578ce://`. [Register this URL scheme](https://developer.apple.com/documentation/uikit/inter-process_communication/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app) by going to the Info tab of your app target settings and adding the below to the URL Types section.

![Image](https://b.stripecdn.com/docs/assets/wechat-ios-custom-url-scheme.dbc6eed4b63ada8e5c68b9c20cb1ef43.png)

## Handle deep linking

To handle deep linking, your app needs to register a custom url scheme. If you’re using Expo, [set your scheme](https://docs.expo.io/guides/linking/#in-a-standalone-app) in the `app.json` file. Otherwise, follow the [React Native Linking module](https://reactnative.dev/docs/linking) docs to configure deep linking. After you’ve configured a scheme, specify a callback to handle the URLs:

```tsx
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { Linking } from 'react-native';
// For Expo use this import instead:
// import * as Linking from 'expo-linking';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { handleURLCallback } = useStripe();

  const handleDeepLink = async () => {
    if (url && url.includes(`wx`)) {
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

    const deepLinkListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => deepLinkListener.remove();
  }, []);

  return <Screen>{/* ... */}</Screen>;
}
```

**Check if the WeChat app is available**

```
Only offer WeChat Pay as an option to your customer if the WeChat App is installed.
```

1. Add [LSApplicationQueriesSchemes](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/LaunchServicesKeys.html#//apple_ref/doc/plist/info/LSApplicationQueriesSchemes) with `weixin` as a value to your `Info.plist`.
   Setting up ability to query for WeChat app in Xcode
   ![Image](https://b.stripecdn.com/docs/assets/wechat-ios-queries.159dda808700c2935966c9a96f63ec18.png)

2. Call `Linking.canOpenURL()` with `weixin://` as the URL and inspect the return value.

## Create a PaymentIntent

Stripe uses a [PaymentIntent](https://stripe.com/docs/api/payment_intents) object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

### Client side

On the client, request a PaymentIntent from your server and store its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret):

```tsx
function PaymentScreen() {
  // ...

  const fetchPaymentIntentClientSecret = useCallback(async () => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'usd',
        items: ['id-1'],
      }),
    });
    const { clientSecret } = await response.json();

    return clientSecret;
  }, []);

  const handlePayPress = useCallback(async () => {
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
  }, [card, fetchPaymentIntentClientSecret]);

  return (
    <View>
      <CardForm
        onFormComplete={(cardDetails) => {
          setCardDetails(cardDetails);
        }}
      />

      <Button onPress={handlePayPress} title="Pay" disabled={loading} />
    </View>
  );
}
```

## Submit the payment to Stripe

When the customer taps **Pay**, confirm the `PaymentIntent` to complete the payment.

Rather than sending the entire PaymentIntent object to the client, use its [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret). This is different from your API keys that authenticate Stripe API requests. The client secret should be handled carefully because it can complete the charge. Don’t log it, embed it in URLs, or expose it to anyone but the customer.

Pass an `appId` and client secret to `confirmPayment`, which you can access with the `useConfirmPayment` hook. The hook also returns a loading value to indicate the state of the asynchronous action:

```tsx
function PaymentScreen() {
  const { confirmPayment, loading } = useConfirmPayment();

  // ...

  const handlePayPress = async () => {
    // Gather the customer's billing information (e.g., email)
    const billingDetails: BillingDetails = {
      email: 'jenny.rosen@example.com',
    };

    // Fetch the intent client secret from the backend
    const clientSecret = await fetchPaymentIntentClientSecret();

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'WeChatPay',
      paymentMethodData: {
        billingDetails,
        appId: 'wx65907d6307c3827d',
      },
    });

    if (error) {
      console.log('Payment confirmation error', error);
    } else if (paymentIntent) {
      console.log('Success from promise', paymentIntent);
    }
  };

  return <View />;
}
```
