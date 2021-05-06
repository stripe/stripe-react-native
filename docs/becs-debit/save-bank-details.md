## Save BECS Direct Debit details for future payments

Use the Setup Intents API to save payment method details for future BECS Direct Debit payments.

## 1. Setup Stripe

The React Native SDK is open source and fully documented. Under the hood it uses native Android and iOS SDKs.

To install the SDK run the following command in your terminal:

```sh
yarn add stripe-react-native
or
npm install stripe-react-native
```

For iOS you will have to run `pod install` inside `ios` directory in order to install needed native dependencies. Android won't require any additional steps.

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/account/apikeys) so that it can make requests to the Stripe API. In order to do that use `StripeProvider` component in the root component of your application or `initStripe` method alternatively.

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

## 3. Collect payment method details and mandate acknowledgment

You can securely collect BECS Debit payment information with `AuBECSDebitForm` component, a drop-in UI component provided by the SDK. `AuBECSDebitForm` provides a UI for customers to enter their name, email, BSB number, and account number—in addition to displaying the [BECS Direct Debit Terms](https://stripe.com/au-becs/legal).

Add a `AuBECSDebitForm` component to the screen with your company name as a prop. You can also customize `AuBECSDebitForm` to match the look and feel of your app by providing `formStyle` prop.

Collect form details with `onComplete` prop to use them when confirming payment.

```tsx
function PaymentScreen() {
  const [formDetails, setFormDetails] = useState<
    AuBECSDebitFormComponent.FormDetails
  >();

  return (
    <View>
      <AuBECSDebitForm
        onComplete={(value) => setFormDetails(value)}
        companyName="Example Company Inc."
        formStyle={{
          textColor: '#000000',
          fontSize: 22,
          placeholderColor: '#999999',
        }}
      />
      <Button title="Pay" variant="primary" onPress={handlePayPress} />
    </View>
  );
}
```

## 3. Create a SetupIntent

### Client side

On the client, request a PaymentIntent from your server and store its client secret.

```tsx
const fetchPaymentIntentClientSecret = async (customerEmail: string) => {
  const response = await fetch(`${API_URL}/create-setup-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: customerEmail,
      payment_method_types: ['au_becs_debit'],
    }),
  });
  const { clientSecret, error } = await response.json();

  return { clientSecret, error };
};
```

## 4. Submit the payment method details to Stripe

Retrieve the client secret from the SetupIntent you created in step 2 and call `confirmPayment` method. This presents a webview where the customer can complete the payment on their bank’s website or app. Afterwards, the promise will be resolved with the result of the payment.

```tsx
function PaymentScreen() {
  const { confirmSetupIntent } = useConfirmSetupIntent();

  const [formDetails, setFormDetails] = useState<
    AuBECSDebitFormComponent.FormDetails
  >();

  const handlePayPress = async () => {
    const { error, paymentIntent } = await confirmSetupIntent(clientSecret, {
      type: 'AuBecsDebit',
      formDetails,
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log('Setup intent confirmation error', error.message);
    } else if (setupIntent) {
      Alert.alert(
        `Success: Setup intent created. Intent status: ${setupIntent.status}`
      );
    }
  };

  return (
    <View>
      <AuBECSDebitForm
        onComplete={(value) => setFormDetails(value)}
        companyName="Example Company Inc."
        formStyle={{
          textColor: '#000000',
          fontSize: 22,
          placeholderColor: '#999999',
        }}
      />
      <Button title="Pay" variant="primary" onPress={handlePayPress} />
    </View>
  );
}
```

## 5. Test the integration
