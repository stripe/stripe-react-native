# Use iDEAL to set up future SEPA Direct Debit payments

Learn how to save bank details from an iDEAL payment and charge your customers later with SEPA Direct Debit.

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

## 3. Create a SetupIntent

## 4. Collect payment method details and mandate acknowledgement

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

To process SEPA Direct Debit payments in the future, you must collect mandate agreement from your customer now.

Display the following standard authorization text for your customer to implicitly sign this mandate.

Replace _Rocket Rides_ with your company name.

```
By providing your payment information and confirming this payment, you authorise (A) Rocket Rides and Stripe, our payment service provider, to send instructions to your bank to debit your account and (B) your bank to debit your account in accordance with those instructions. As part of your rights, you are entitled to a refund from your bank under the terms and conditions of your agreement with your bank. A refund must be claimed within 8 weeks starting from the date on which your account was debited. Your rights are explained in a statement that you can obtain from your bank. You agree to receive notifications for future debits up to 2 days before they occur.
```

The details of the accepted mandate are generated when setting up a payment method. Because the customer has implicitly signed the mandate when accepting the terms suggested above, you must communicate the terms on the form or in an email.

## 5. Submit the payment method details to Stripe

Retrieve the client secret from the PaymentIntent you created in step 2 and call `confirmPayment` method. This presents a webview where the customer can complete the payment on their bank’s website or app. Afterwards, the promise will be resolved with the result of the payment.

The Stripe React Native SDK specifies `safepay/` as the host for the return URL for bank redirect methods. After the customer completes their payment with iDEAL, your app will be opened with `myapp://safepay/` where `myapp` is your custom URL scheme.

```tsx
export default function IdealPaymentScreen() {
  const [name, setName] = useState();
  const [bankName, setBankName] = useState();
  const [email, setEmai] = useState();

  const handlePayPress = async () => {
    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name,
      email,
    };
  };

  const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
    type: 'Ideal',
    billingDetails,
    bankName,
  });

  if (error) {
    Alert.alert(`Error code: ${error.code}`, error.message);
  } else if (paymentIntent) {
    Alert.alert(
      'Success',
      `Setup intent created. Intent status: ${setupIntent.status}`
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

## 6. Handle deep linking

At first you need to register url schemes for [iOS](https://developer.apple.com/documentation/xcode/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app) and [Android](https://developer.android.com/training/app-links/deep-linking).

Next, Follow [Linking](https://reactnative.dev/docs/linking) module documentation to configure and enable handling deep links in your app.

When you configured deep linking you can follow this example code to handle particular URL's. It should be placed in your App root component.

```tsx
const handleDeppLink = () => {
  if (url && url.includes(`safepay`)) {
    navigation.navigate('PaymentResultScreen', { url });
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

## 7. Charge the SEPA Direct Debit PaymentMethod later

## 8. Test your integration
