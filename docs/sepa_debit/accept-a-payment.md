# Accept a SEPA Direct Debit payment

## 1. Set up Stripe

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add @stripe/react-native
or
npm install @stripe/react-native
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application.

```tsx
import { StripeProvider } from '@stripe/react-native';

function App() {
  return (
    <StripeProvider publishableKey="pk_test_51Ho4m5A51v44wNexXNFEg0MSAjZUzllhhJwiFmAmJ4tzbvsvuEgcMCaPEkgK7RpXO1YI5okHP08IUfJ6YS7ulqzk00O2I0D1rT">
      // Your app code here
    </StripeProvider>
  );
}
```

## 2. Create or retrieve a Customer

## 3. Create a PaymentIntent

## 4. Collect payment method details and mandate acknowledgment

Collect the customer's IBAN in your payment form and display the following standard authorization text for your customer to implicitly sign the mandate.

Replace Rocket Rides with your company name.

```txt
By providing your payment information and confirming this payment, you authorise (A) Rocket Rides and Stripe, our payment service provider, to send instructions to your bank to debit your account and (B) your bank to debit your account in accordance with those instructions. As part of your rights, you are entitled to a refund from your bank under the terms and conditions of your agreement with your bank. A refund must be claimed within 8 weeks starting from the date on which your account was debited. Your rights are explained in a statement that you can obtain from your bank. You agree to receive notifications for future debits up to 2 days before they occur.
```

```js
export default function SepaPaymentScreen() {
  const [email, setEmail] = useState('');
  const [iban, setIban] = useState('');

  return (
    <Screen>
      <TextInput
        placeholder="E-mail"
        keyboardType="email-address"
        onChange={(value) => setEmail(value.nativeEvent.text)}
        style={styles.input}
      />
      <TextInput
        placeholder="Iban"
        onChange={(value) => setIban(value.nativeEvent.text.toLowerCase())}
        style={styles.input}
      />
      <Button
        variant="primary"
        onPress={handlePayPress}
        title="Save IBAN"
        loading={loading}
      />
    </Screen>
  );
}
```

## 5. Submit the payment to Stripe

Retrieve the client secret from the PaymentIntent you created in step 2 and call `confirmPaymentIntent` method.

```js
export default function SepaPaymentScreen() {
  const [iban, setIban] = useState('');
  const { confirmPayment, loading } = useConfirmPayment();

  const handlePayPress = async () => {
    const {
      clientSecret,
      error: clientSecretError,
    } = await fetchPaymentIntentClientSecret();

    if (clientSecretError) {
      Alert.alert(`Error`, clientSecretError);
      return;
    }

    const billingDetails: PaymentMethodCreateParams.BillingDetails = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      type: 'SepaDebit',
      billingDetails,
      iban,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else if (paymentIntent) {
      if (paymentIntent.status === PaymentIntents.Status.Processing) {
        Alert.alert(
          'Processing',
          `The debit has been successfully submitted and is now processing.`
        );
      } else if (paymentIntent.status === PaymentIntents.Status.Succeeded) {
        Alert.alert(
          'Success',
          `The payment was confirmed successfully! currency: ${paymentIntent.currency}`
        );
      } else {
        Alert.alert('Payment status:', paymentIntent.status);
      }
    }
  };

  return <Screen>{/* ... */}</Screen>;
}
```

## 6. Confirm the PaymentIntent succeeded

## 7. Test the integration
