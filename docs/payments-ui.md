# Payments UI

The Payments UI is a prebuilt bottom sheet for handling payments both on iOS and Android.

## Setup Stripe

### Client side

The latest beta release can be found on the [`payment-sheet` branch](https://github.com/stripe/stripe-react-native/tree/payment-sheet). Git clone the repository to your local machine, checkout the `payment-sheet` branch, run `yarn bootstrap`, and finally [follow the instructions](https://github.com/stripe/stripe-react-native/blob/master/CONTRIBUTING.md#install-library-as-local-repository) to install the library.

For iOS you will have to run `pod install` in your `ios` directory in order to install needed native dependencies. Android doesn't require any additional steps.

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

## Add a server andpoint

Add a server endpoint.

## Integrate the payment sheet

Before getting started, your checkout page should:

- Show the products being purchased and the total amount
- Collect any shipping information required
- Include a checkout button to present Stripe’s UI

![Present a prebuilt payment sheet to handle the entire payment flow. In the payment sheet, your customer can reuse a saved payment method or add a new one. Your customer taps a “Buy” button in the payment sheet to complete the payment.](./assets/overview-complete.png 'PaymentSheet')

Next, integrate Stripe’s prebuilt payment UI in your app’s checkout using use the `initPaymentSheet` method from `useStripe` hook. PaymentSheet guides the customer through the payment process, combining all the steps required — collecting payment details, billing details, and confirming the payment — into a single sheet. If you prefer a more customized checkout experience, consider using the [Custom integration](#custom-integration).

First, configure the `StripeProvider` with your Stripe publishable key so that it can make requests to the Stripe API.

In your app’s checkout, make a network request to the backend endpoint you created in the previous step and initialize `PaymentSheet`. To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
Save your `clientSecret` for the future usage

```tsx
export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [initialised, setInitialised] = useState(false);
  const [clientSecret, setClientSecret] = useState();

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customer,
    } = await response.json();

    return {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
    };
  };

  const initialisePaymentSheet = async () => {
    const {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
    } = await fetchPaymentSheetParams();

    setClientSecret(clientSecret);

    const { error } = await initPaymentSheet({
      customerId,
      customerEphemeralKeySecret,
      paymentIntentClientSecret,
    });
    if (!error) {
      setInitialised(true);
    }
  };

  const openPaymentSheet = async () => {
    // see below
  };

  useEffect(() => {
    initialisePaymentSheet();
  }, []);

  return (
    <Screen>
      <Button
        variant="primary"
        disabled={!initialised}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </Screen>
  );
}
```

When the checkout button is tapped, call `presentPaymentSheet` with `clientSecret` fetched from the backend before to open the sheet. After the customer completes the payment, the sheet is dismissed and the Promise is resolved with a `StripeError<PaymentSheetError>` if any occured.

```tsx
export default function CheckoutScreen() {
  // continued from above

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet({
      clientSecret,
    });

    if (error) {
      console.log('error', error.message);
    } else {
      console.log('success');
    }
  };

  return (
    <Screen>
      <Button
        variant="primary"
        disabled={!initialised}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </Screen>
  );
}
```

See PaymentSheet API for more details.

You’re done! Read on to learn more about the Custom integration style and integrating Apple Pay and Google Pay.

## Custom integration

If you prefer a more customized checkout experience, you can use the Custom integration style. Choose this style if:

- Your checkout screen has a “Choose payment method” button to collect payment details, and a separate “Buy” button to complete the payment.
- You want your customer to complete the payment on your checkout screen instead of our payment sheet.

If you choose this integration, you’ll use `customFlow` flag while setting up the payment sheet which breaks down PaymentSheet into its individual steps, and lets you control when those steps happen. For example, your checkout page can display a “Choose payment method” button to collect payment details, and a separate “Buy” button to finalize the payment

## React Native

This guide assumes you have a payment details button with a label and an image that can display the details of a selected payment method and a buy button.

In your app’s checkout, make a network request to your backend endpoint and initialize the PaymentSheet in custom mode. To reduce loading time, make this request before the Checkout button is tapped, e.g. when the screen is loaded.
Save your `clientSecret` for the future usage.

```tsx
export default function CheckoutScreen() {
  const {
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
  } = useStripe();
  const [initialised, setInitialised] = useState(false);
  const [clientSecret, setClientSecret] = useState();

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
    } = await response.json();

    return {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
    };
  };

  const initialisePaymentSheet = async () => {
    const {
      paymentIntentClientSecret,
      customerEphemeralKeySecret,
      customerId,
    } = await fetchPaymentSheetParams();

    setClientSecret(paymentIntentClientSecret);

    const { error } = await initPaymentSheet({
      customerId,
      customerEphemeralKeySecret,
      paymentIntentClientSecret,
      customFlow: true, // it forces to use custom FlowController
      merchantDisplayName: 'Example Inc.',
      style: 'alwaysDark',
    });
    if (!error) {
      setInitialised(true);
    }
  };

  const choosePaymentOption = async () => {
    // see below
  };

  const onPressBuy = async () => {
    // see below
  };

  useEffect(() => {
    initialisePaymentSheet();
  }, []);

  return (
    <Screen>
      <View>
        <Button
          variant="primary"
          loading={loading}
          title={
            paymentMethod ? (
              <View style={styles.row}>
                <Image
                  source={{
                    uri: `data:image/png;base64,${paymentMethod.image}`,
                  }}
                  style={styles.image}
                />
                <Text style={styles.text}>{paymentMethod.label}</Text>
              </View>
            ) : (
              'Choose payment method'
            )
          }
          disabled={!paymentSheetEnabled}
          onPress={choosePaymentOption}
        />
      </View>

      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentMethod}
          title="Buy"
          onPress={onPressBuy}
        />
      </View>
    </Screen>
  );
}
```

`presentPaymentSheet` resolves with a paymentOption property containing an image and label representing the customer’s payment method. After PaymentSheet.FlowController is initialized, enable your payment method button and update its UI with the paymentOption.

When the customer taps your payment method button, collect their payment details by calling `presentPaymentSheet` with `confirmPayment` set to `false` and `clientSecret` fetched from your backend before. When the customer finishes, the sheet dismisses itself and resolve the Promise. Update your payment method button with the selected payment method details.

```tsx
export default function CheckoutScreen() {
  // continued from above

  const [paymentMethod, setPaymentMethod] = useState<{
    image: string;
    label: string;
  } | null>(null);

  const choosePaymentOption = async () => {
    const { error, paymentOption } = await presentPaymentSheet({
      clientSecret,
      confirmPayment: false,
    });

    if (error) {
      console.log('error', error);
    } else if (paymentOption) {
      setPaymentMethod({
        label: paymentOption.label,
        image: paymentOption.image,
      });
    } else {
      setPaymentMethod(null);
    }
  };

  const onPressBuy = async () => {
    // see below
  };

  return (
    <Screen>
      <View>
        <Button
          variant="primary"
          loading={loading}
          title={
            paymentMethod ? (
              <View style={styles.row}>
                <Image
                  source={{
                    uri: `data:image/png;base64,${paymentMethod.image}`,
                  }}
                  style={styles.image}
                />
                <Text style={styles.text}>{paymentMethod.label}</Text>
              </View>
            ) : (
              'Choose payment method'
            )
          }
          disabled={!paymentSheetEnabled}
          onPress={choosePaymentOption}
        />
      </View>

      <View style={styles.section}>
        <Button
          variant="primary"
          loading={loading}
          disabled={!paymentMethod}
          title="Buy"
          onPress={onPressBuy}
        />
      </View>
    </Screen>
  );
}
```

Finally, when your buy button is tapped, call `confirmPaymentSheetPayment` to complete the payment.

```tsx
// ...
const { confirmPaymentSheetPayment } = useStripe();

const onPressBuy = async () => {
  const { error } = await confirmPaymentSheetPayment();

  if (error) {
    Alert.alert(`Error code: ${error.code}`, error.message);
  } else {
    Alert.alert('Success', 'The payment was confirmed successfully!');
  }
};

// ...
```

## Apple Pay

If your checkout page has a dedicated Apple Pay button, follow [our Apple Pay guide](./apple-pay.md) to collect payment from your Apple Pay button. You can use PaymentSheet to handle other payment method types.

First, follow steps 1–3 in our [Accept Apple Pay](https://stripe.com/docs/apple-pay?platform=native-ios#accept) in your iOS app guide. Once you’ve finished adding the Apple Pay capability in Xcode, return to this guide.

Next, [set your merchant ID in `StripeProvider`](./api-reference/components.md#stripeprovider) and `applePay` property during initializing PaymentSheet with the country code of your business (check your account details [here](https://dashboard.stripe.com/settings/account%5D)):

```tsx
await initPaymentSheet({
  // ...
  applePay: true,
  merchantCountryCode: 'US',
});
```

## Google Pay

First, follow step 1 in our [Accepting Google Pay in your Android app](https://stripe.com/docs/google-pay#setup) guide. Once you’ve finished updating your AndroidManifest.xml, return to this guide.

Next, enable `googlePay` and provide your `merchantCountryCode` when initializing PaymentSheet. Additionally you can pass the `testEnv` property to force using the test environment. Note that Google Pay requires approval for [production access](https://developers.google.com/pay/api/android/guides/test-and-deploy/request-prod-access).

```tsx
const { error, paymentOption } = await initPaymentSheet({
  // ...
  googlePay: true,
  merchantCountryCode: 'US',
  testEnv: true, // use test environment
});
```

Note that Google Pay can only be tested on a physical device. Follow the [React Native docs](https://reactnative.dev/docs/running-on-device) to run your application on a physical Android device.

## Card scanning

To enable card scanning support, set the `NSCameraUsageDescription` (“Privacy - Camera Usage Description”) in your application’s Info.plist, and provide a reason for accessing the camera (e.g. “To scan cards”). Card scanning is supported on devices with iOS 13 or higher.

## Customization

All customization is configured via the `initPaymentSheet` method.

### Merchant display name

You can specify your own customer-facing business name instead of your app’s name. This is used to display a “Pay (merchantDisplayName)” line item in the Apple Pay sheet.

```tsx
await initPaymentSheet({
  // ...
  merchantDisplayName: 'Example Inc.',
});
```

### UserInterfaceStyle

`PaymentSheet` automatically adapts to the user’s system-wide appearance settings (light & dark mode). If your app doesn’t support dark mode, you can set `style` property to alwaysLight or alwaysDark mode.

```tsx
await initPaymentSheet({
  // ...
  style: 'alwaysDark',
});
```
