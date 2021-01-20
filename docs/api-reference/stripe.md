# Stripe

To get the content of the Stripe object you have to use `useStripe` hook. This hook returns an object with methods from the below list.

## confirmPayment

Confirms the PaymentIntent with the provided parameters. Call this method if you are using automatic confirmation.

```ts
(
  paymentIntentClientSecret: string,
  cardDetails: CardDetails
) =>  Promise<Intent>
```

### Arguments

- `paymentIntentClientSecret: string` - client secret
- `cardDetails: CardDetails` - card details collected by `CardField`

### Return value

A promise with `Intent` object.

## createPaymentMethod

Converts a card details object into a Stripe Payment Method using the Stripe API.

```ts
(cardDetails: CardDetails) => Promise<PaymentMethod>;
```

### Arguments

- `cardDetails: CardDetails` - card details collected by `CardField`

### Return value

A promise with `PaymentMethod` object.

## handleNextPaymentAction

Handles any `nextAction` required to authenticate the Intent.

```ts
(paymentIntentClientSecret: string) => Promise<Intent>
```

### Arguments

- `paymentIntentClientSecret: string` - client secret

### Return value

A promise with `Intent` object.

## isApplePaySupported

An asynchronous function returns information about ApplePay support on the device.

```ts
() => Promise<boolean>
```

### Return value

A promise with information about ApplePay support on the device.

## presentApplePay

Initiates the Apple Pay payment.

```ts
(items: CartSummaryItem[]): Promise<void>
```

### Arguments

- `items: CartSummaryItem[]` - cart items to be displayed in Apple Pay sheet

### Return value

Promise without any data.

## confirmApplePayPayment

Apple Pay payment completion method. Should be called with clientSecret after payment intent creation on server side.

```ts
confirmApplePayPayment(clientSecret: string): Promise<void>
```

### Arguments

- `clientSecret: string` - client secret

### Return value

Promise without any data.

## confirmSetupIntent

Confirms setup intent creation for future payments. Requires client secret and card and billing details.

```ts
(
  paymentIntentClientSecret: string,
  cardDetails: CardDetails,
  billingDetails: BillingDetails
) => Promise<SetupIntent>;
```

### Arguments

- `paymentIntentClientSecret: string` - client secret
- `cardDetails: CardDetails` - card details collected by `CardField`
- `billingDetails: BillingDetails` - billing details like address or email

### Return value

Promise with `SetupIntent` object.
