# **Tipsi-stripe migration guide**

## Introduction

`stripe-react-native` is a official replacement for `tipsi-stripe`, provides bunch of functionalities which allows you to build delightful payment experiences using `React Native`.
In addition to those already available in `tipsi-stripe` we also offer features like [Pre-built payments UI](https://stripe.com/docs/mobile/payments-ui-beta), [Simplified Security](https://stripe.com/docs/security) and [more](https://github.com/stripe/stripe-react-native/tree/feat/tipsi-migration-guide#features)...

## Installation

**IMPORTANT:**
If migrating from `tipsi-stripe` to `stripe-react-native`, please be sure to first remove all `tipsi-stripe` dependencies from your project. `tipsi-stripe` uses older versions of `stripe-android` and `stripe-ios` which aren't compatible with `stripe-react-native`.

## Usage

`stripe-react-native` library provides two initializing ways, in order to do this you can use either `StripeProvider` component or `initStripe` method.
Please refer to [documentation](https://github.com/stripe/stripe-react-native#stripe-initialization) for more details.

_before_:

```tsx
stripe.setOptions({
  publishableKey: 'PUBLISHABLE_KEY',
  merchantId: 'MERCHANT_ID', // Optional
  androidPayMode: 'test', // Android only
});
```

_after_:
[initStripe](https://stripe.dev/stripe-react-native/api-reference/modules.html#initStripe) or [StripeProvider](https://stripe.dev/stripe-react-native/api-reference/modules.html#StripeProvider)

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

// ...

<StripeProvider
  publishableKey="publishable_key"
  merchantIdentifier="merchant.identifier"
 >
  // Your app code here
</StripeProvider>

or

import { initStripe } from '@stripe/stripe-react-native';

// ...

initStripe({
  publishableKey: 'publishable_key'
  merchantIdentifier: 'merchant.identifier',
});
```

## Class vs functional components

All of the stripe functions can be imported directly from `@stripe/stripe-react-native` so that you can use them both with `class` and `functional` components.
However, you are also able to access them via dedicated `hooks`.
For instance you can use `useConfirmPayment` hook which apart from `confirmPayment` method provides also `loading` state so you don't need to handle it manually.
Moreover, there is also the main `useStripe` hook which provides all of the stripe methods.
examples:

1.

```tsx
import { useConfirmPayment } from '@stripe/stripe-react-native';

const { confirmPayment, loading } = useConfirmPayment();

// await confirmPayment(...)
```

2.

```tsx
import { useStripe } from '@stripe/stripe-react-native';

const { confirmPayment } = useStripe();

// await confirmPayment(...)
```

3.

```tsx
import { confirmPayment } from '@stripe/stripe-react-native';

// await confirmPayment(...)
```

## Card components

Use below components on your payment screen to securely collect card details from your customers.

_before:_

```tsx
<PaymentCardTextField
	style={styles.field}
	cursorColor={...}
	textErrorColor={...}
	placeholderColor={...}
	numberPlaceholder={...}
	expirationPlaceholder={...}
	cvcPlaceholder={...}
	disabled={false}
	onParamsChange={(valid, params) => {
		console.log(`
			Valid: ${valid}
			Number: ${params.number || '-'}
			Month: ${params.expMonth || '-'}
			Year: ${params.expYear || '-'}
			CVC: ${params.cvc || '-'}
`		);
	}}
/>
```

_after:_
[CardField](https://stripe.dev/stripe-react-native/api-reference/modules.html#CardField)

```tsx
<CardField
  postalCodeEnabled={false}
  autofocus
  placeholders={{
    number: '4242 4242 4242 4242',
    postalCode: '12345',
    cvc: 'CVC',
    expiration: 'MM|YY',
  }}
  onCardChange={(cardDetails) => {
    console.log('cardDetails', cardDetails);
  }}
  onFocus={(focusedField) => {
    console.log('focusField', focusedField);
  }}
  cardStyle={{
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderRadius: 8,
    fontSize: 14,
    placeholderColor: '#999999',
  }}
  style={{ width: '100%', height: 200 }}
/>
```

or
[CardForm](https://stripe.dev/stripe-react-native/api-reference/modules.html#CardForm)

```tsx
<CardForm
  autofocus
  cardStyle={{
    backgroundColor: '#FFFFFF',
  }}
  style={{ width: '100%', height: 350 }}
  onFormComplete={(cardDetails) => {
    setComplete(cardDetails.complete);
  }}
/>
```

## PaymentIntent API

Please note that for PCI compliance reasons all of the sensitive data is sent to the specific methods under the hood and you don’t need to hand it over on your own. This means that in order to proceed any `Card` payment, you have to collect the data using either [CardField](https://stripe.dev/stripe-react-native/api-reference/modules.html#CardField) or [CardForm](https://stripe.dev/stripe-react-native/api-reference/modules.html#CardForm) component provided by `stripe-react-native` library. In this way the personal data is secure, as it is kept confidential from developers.

### createPaymentMethod()

Creating a payment method using card details:

_before_:

```tsx
try {
  const paymentMethod = await stripe.createPaymentMethod({
    card: {
      number: '4000002500003155',
      cvc: '123',
      expMonth: 11,
      expYear: 2020,
    },
  });
} catch (e) {
  // Handle error
}
```

_after_:
[createPaymentMethod](https://stripe.dev/stripe-react-native/api-reference/modules.html#createPaymentMethod)

```tsx
// ...
const { paymentMethod, error } = await createPaymentMethod({
  type: 'Card',
  billingDetails: {
    email: 'email@stripe.com',
  }, // optional
});

return (
  <CardField style={{ width: '100%', height: 100 }} postalCodeEnabled={true} />
);
```

## Confirm payment Intent - Manual

If your payment requires action (i.e. `status == 'requires_action'`), you have to call this specific method in order to launch an activity where the user can authenticate the payment.
Call this method if you are using manual confirmation.

_before:_

```tsx
await stripe.authenticatePaymentIntent({ clientSecret: 'client_secret' });
```

_after:_
[handleNextAction](https://stripe.dev/stripe-react-native/api-reference/modules.html#handleNextAction)

```tsx
const { error, paymentIntent } = await handleNextAction('client_secret');
```

## Confirm payment Intent - Automatic

Call this method if you are using automatic confirmation.

_before:_

```tsx
const confirmPaymentResult = await stripe.confirmPaymentIntent({
	clientSecret: 'client_secret',
	paymentMethod: {
		billingDetails: {...},
		card: {
			cvc: '242',
			expMonth: 11,
			expYear: 2040,
			number: '4000002500003155',
		}
	});
```

_after:_
[confirmPayment](https://stripe.dev/stripe-react-native/api-reference/modules.html#confirmPayment)

```tsx
// ...
const { error, paymentIntent } = await confirmPayment('client_secret', {
	paymentMethodType:  'Card',
  paymentMethodData: {
	  billingDetails: {...},
  }
});

// ...

return (
 <CardField
    style={{ width: '100%', height: 100 }}
    postalCodeEnabled={true}
  />
);
```

## Set up future payments

Use this integration to set up recurring payments or to create one-time payments with a final amount determined later, often after the customer receives your service.

_before:_

```tsx
try {
  const result = await stripe.confirmSetupIntent({ clientSecret: '...' });
} catch (e) {
  // handle exception here
}
```

_after:_
[confirmSetupIntent](https://stripe.dev/stripe-react-native/api-reference/modules.html#confirmSetupIntent)

```tsx
const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
  type: 'Card',
  billingDetails,
});

// ...

return (
  <CardField style={{ width: '100%', height: 100 }} postalCodeEnabled={true} />
);
```

## Apple Pay

### deviceSupportsNativePay()

Before displaying Apple Pay as a payment option in your app, determine if the user’s device supports Apple Pay and that they have a card added to their wallet.
In order to this `stripe-react-native` provides `isApplePaySupported` boolean value from `useApplePay` hook.

**NOTE**: The iOS Simulator always returns `true`.

_before:_

```tsx
import stripe from 'tipsi-stripe'
// ...
const isApplePaySupported = await stripe.deviceSupportsNativePay()
// ...
return (
	// ...
	{isApplePaySupported && (
		<Button onPress={pay} />
	)}
);
```

_after:_
[isApplePaySupported](https://stripe.dev/stripe-react-native/api-reference/modules.html#isApplePaySupported)

```tsx
import { useApplePay } from '@stripe/stripe-react-native'
// ...
const { isApplePaySupported } = useApplePay()
// ...
return (
	// ...
	{isApplePaySupported && (
		<Button onPress={pay} />
	)}
);
```

if your application doesn't use functional components, as an alternative you can import `isApplePaySupported` method directly.

```tsx
import { isApplePaySupported } from '@stripe/stripe-react-native';
// ...
const isSupported = isApplePaySupported();
// ...
```

### paymentRequestWithNativePay()

Next, initialize the payment.
Please refer to the [documentation](https://stripe.dev/stripe-react-native/api-reference/modules.html#presentApplePay) for all available properties.

_before:_

```tsx
const items = [
  {
    label: 'Whisky',
    amount: '50.00',
  },
];

const shippingMethods = [
  {
    id: 'fedex',
    label: 'FedEX',
    detail: 'Test @ 10',
    amount: '10.00',
  },
];

const options = {
  requiredBillingAddressFields: ['all'],
  requiredShippingAddressFields: ['phone', 'postal_address'],
  shippingMethods,
};

const token = await stripe.paymentRequestWithNativePay(items, options);
```

_after:_
[presentApplePay](https://stripe.dev/stripe-react-native/api-reference/modules.html#presentApplePay)

```tsx
const shippingMethods = [
  {
    identifier: 'standard',
    detail: 'Arrives by June 29',
    label: 'Standard Shipping',
    amount: '3.21',
  },
];

const items = [
  { label: 'Subtotal', amount: '12.75', type: 'final' },
  { label: 'Shipping', amount: '0.00', type: 'pending' },
  { label: 'Total', amount: '12.75', type: 'pending' }, // Last item in array needs to reflect the total.
];

const { error, paymentMethod } = await presentApplePay({
  cartItems: items,
  country: 'US',
  currency: 'USD',
  shippingMethods,
  requiredShippingAddressFields: [
    'emailAddress',
    'phoneNumber',
    'postalAddress',
    'name',
  ],
  requiredBillingContactFields: ['phoneNumber', 'name'],
  jcbEnabled: true,
});
```

### completeNativePayRequest()

Call this method to complete the payment.

_before:_

```tsx
try {
  stripe.completeNativePayRequest();
} catch (error) {
  // ...
}
```

_after:_
[confirmApplePayPayment](https://stripe.dev/stripe-react-native/api-reference/modules.html#confirmApplePayPayment)

```tsx
const { error } = await confirmApplePayPayment('client_secret');
```

## GooglePay

### paymentRequestWithNativePay()

_before:_

```tsx
const token = await stripe.paymentRequestWithNativePay({
  total_price: '100.00',
  currency_code: 'USD',
  shipping_address_required: true,
  phone_number_required: true,
  shipping_countries: ['US', 'CA'],
  line_items: [
    {
      currency_code: 'USD',
      description: 'Whisky',
      total_price: '50.00',
      unit_price: '50.00',
      quantity: '1',
    },
  ],
});
```

_after:_ [initGooglePay](https://stripe.dev/stripe-react-native/api-reference/modules.html#initGooglePay) and [presentGooglePay](https://stripe.dev/stripe-react-native/api-reference/modules.html#presentGooglePay)

```tsx
const { error } = await initGooglePay({
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
    // handle error
    return;
}
const { error: presentError } = await presentGooglePay({
    clientSecret,
    forSetupIntent: true,
    currencyCode: 'USD',
});
```

As against to `tipsi-stripe`, `stripe-react-native` provide separate API for GooglePay, please refer to the [documentation](https://stripe.com/docs/google-pay?platform=react-native) for more details.

## Create a token

### createTokenWithCard()

Use this method to convert information collected by card components into a single-use [Token](https://stripe.com/docs/api#tokens) that you safely pass to your server to use in an API call.

_before:_

```tsx
const params = {
  number: '4242424242424242',
  expMonth: 11,
  expYear: 17,
  cvc: '223',
  name: 'Test User',
  currency: 'usd',
  addressLine1: '123 Test Street',
  addressLine2: 'Apt. 5',
  addressCity: 'Test City',
  addressState: 'Test State',
  addressCountry: 'Test Country',
  addressZip: '55555',
};
const token = await stripe.createTokenWithCard(params);
```

_after:_
[createToken](https://stripe.dev/stripe-react-native/api-reference/modules.html#createToken)

```tsx
const { createToken } = useStripe()
// ...
const { token, error } = await createToken({
	type: 'Card'
	address: {
		country: 'US',
		// ...
	},
	name: 'card_name'
});
// ...
return (
 <CardField
    style={{ width: '100%', height: 100 }}
  />
);
```
