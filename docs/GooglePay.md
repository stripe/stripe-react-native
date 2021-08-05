# Google Pay

## Learn how to accept payments using Google Pay.

Google Pay allows customers to make payments in your app or website using any credit or debit card saved to their Google Account, including those from Google Play, YouTube, Chrome, or an Android device. Use the Google Pay API to request any credit or debit card stored in your customer’s Google account.

Google Pay is fully compatible with Stripe’s products and features (e.g., [subscriptions](https://stripe.com/docs/billing)), allowing you to use it in place of a traditional payment form whenever possible. Use it to accept payments for physical goods, donations, subscriptions, and more.

## Setup Stripe

### Server side

//

### Client side

The [React Native SDK](https://github.com/stripe/stripe-react-native) is open source and fully documented. Internally, it makes use of native iOS and Android SDKs.
Install the SDK by running:

```sh
yarn add react-native-stripe-sdk
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

When your app starts, configure the SDK with your Stripe [publishable key](https://stripe.com/dashboard.stripe.com/account/apikeys) so it can make requests to the Stripe API:

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51ITUqcBDuqlYGNW28TM0Of8JNHxKgXKlBOzNi0sILDmyqxsCd6ACZmb2cjstrcrfnhXJR47w9D8Tezqbdqm24HRQ00lqUzh0eg"
      urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
      merchantIdentifier="merchant.com.{{YOUR_APP_NAME}}" // required for Apple Pay
    >
      // Your app code here
    </StripeProvider>
  );
}
```

## Initialize Google Pay

Next, initialize a Google Pay by calling `initGooglePay` method. Call this on initial render of your checkout screen for best performance.

`initGooglePay` accepts several configuration options that can be customized for your needs.
See [SDK Reference](https://stripe.dev/stripe-react-native/api-reference/index.html) for more details.

```tsx
import { useGooglePay } from 'stripe-react-native';

function CheckoutScreen() {
  const { initGooglePay } = useGooglePay();
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function initialize() {
      const { error } = await initGooglePay({
        testEnv: true,
        merchantName: 'Widget Store'
        countryCode: 'US',
        billingAddressConfig: {
          format: 'FULL',
          isPhoneNumberRequired: true,
          isRequired: false,
        },
        existingPaymentMethodRequired: false,
        isEmailRequired: true,
      });

      if (error) {
        Alert.alert(error.code, error.message);
        return;
      }
      setInitialized(true);
    }
    initialize();
  }, [initGooglePay]);
}
```

After initializing GooglePay, the `initGooglePay` promise is resolved, it's successful if there is no error. This information can be used to update your UI to indicate to your customer that Google Pay is ready to be used.

```tsx
import { useGooglePay } from 'stripe-react-native';

function CheckoutScreen() {
  const [initialized, setInitialized] = useState(false);

  // continued from above

  return (
    <Screen>
      <Button
        disabled={!initialized}
        onPress={pay}
        title="Pay with Google Pay"
      />
    </Screen>
  );
}
```

## Present Google Pay sheet

After Google Pay is available and your app has obtained a PaymentIntent or SetupIntent client secret, call `presentGooglePay` method. When confirming a SetupIntent, provide `useSetupIntent: true` as a parameter, additional `currencyCode` param will be required.

Confirming SetupIntent:

```tsx
const pay = async () => {
  const clientSecret = await fetchPaymentIntentClientSecret();

  const { error } = await presentGooglePay({
    clientSecret,
    forSetupIntent: true,
    currencyCode: 'USD',
  });

  if (error) {
    Alert.alert(error.code, error.message);
    return;
  }
  Alert.alert('Success', 'The SetupIntent was confirmed successfully.');
  setInitialized(false);
};
```

Confirming PaymentIntent:

```tsx
const pay = async () => {
  const clientSecret = await fetchPaymentIntentClientSecret();

  const { error } = await presentGooglePay({
    clientSecret,
    forSetupIntent: false,
  });

  if (error) {
    Alert.alert(error.code, error.message);
    return;
  }
  Alert.alert('Success', 'The PaymentIntent was confirmed successfully.');
  setInitialized(false);
};
```

## Creating a PaymentMethod

If you confirm your payment on your server, you can use GooglePay to only collect a `PaymentMethod` instead of confirm payment.
In order to do that call a `createGooglePayPaymentMethod` method.

```tsx
const { initGooglePay, createGooglePayPaymentMethod } = useGooglePay();

const createPaymentMethod = async () => {
  const { error, paymentMethod } = await createGooglePayPaymentMethod({
    amount: 12,
    currencyCode: 'USD',
  });

  if (error) {
    Alert.alert(error.code, error.message);
    return;
  } else if (paymentMethod) {
    Alert.alert(
      'Success',
      `The payment method was created successfully. paymentMethodId: ${paymentMethod.id}`
    );
  }
  setInitialized(false);
};
```
