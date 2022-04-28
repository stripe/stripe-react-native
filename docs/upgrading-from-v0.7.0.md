# Summary of changes

`@stripe/stripe-react-native` v0.8.0 brings a change to the parameters provided to the `createPaymentMethod`, `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup` methods. Simply put, there are three changes:

## 1. Renamed the `type` field to `paymentMethodType`

- This affects the first argument to `createPaymentMethod`, and the second argument to `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`

## 2. Moved all other payment method data to a nested object under the `paymentMethodData` key.

- This affects the first argument to `createPaymentMethod`, and the second argument to `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`

## 3. Moved `setupFutureUsage` to the `options` argument

- This means you'll now pass `setupFutureUsage` to the third argument of `confirmPayment` and `confirmSetupIntent`, instead of the second argument.

## 4. Renamed `type` field to `paymentMethodType` on `PaymentMethod.Result`, `PaymentIntent.Result`, and `SetupIntent.Result`

- These types are returned by the following methods: `createPaymentMethod`, `retrieveSetupIntent`, `confirmSetupIntent`, `confirmPayment`, `collectBankAccountForPayment`, `collectBankAccountForSetup`, `verifyMicrodepositsForPayment`, or `verifyMicrodepositsForSetup`.

# Examples

Below are the old payment method type formats, followed by the new ones. This represents the object you would pass as the first argument to `createPaymentMethod`, and the second argument to `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`.

### Card

Before:

```js
{
  type: 'Card',
  token: string,
  billingDetails: BillingDetails,
}
// OR
{
  type: 'Card',
  paymentMethodId: string,
  cvc: string,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Card',
  paymentMethodData: {
    token: string,
    billingDetails: BillingDetails,
  }
}
// OR
{
  paymentMethodType: 'Card',
  paymentMethodData: {
    paymentMethodId: string,
    cvc: string,
    billingDetails: BillingDetails,
  }
}
```

### Ideal

Before:

```js
{
  type: 'Ideal',
  bankName: string,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Ideal',
  paymentMethodData: {
    bankName: string,
    billingDetails: BillingDetails,
  }
}
```

### Fpx

Before:

```js
{
  type: 'Fpx',
  testOfflineBank: boolean
}
```

After

```js
{
  paymentMethodType: 'Fpx',
  paymentMethodData: { testOfflineBank: boolean }
}
```

### Alipay

Before:

```js
{
  type: 'Alipay',
}
```

After

```js
{
  paymentMethodType: 'Alipay',
}
```

### Oxxo

Before:

```js
{
  type: 'Oxxo',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Oxxo',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### Sofort

Before:

```js
{
  type: 'Sofort',
  country: string,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Sofort',
  paymentMethodData: {
    country: string,
    billingDetails: BillingDetails,
  }
}
```

### GrabPay

Before:

```js
{
  type: 'GrabPay',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'GrabPay',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### Bancontact

Before:

```js
{
  type: 'Bancontact',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Bancontact',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### SepaDebit

Before:

```js
{
  type: 'SepaDebit',
  iban: string,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'SepaDebit',
  paymentMethodData: {
    iban: string,
    billingDetails: BillingDetails,
  }
}
```

### Giropay

Before:

```js
{
  type: 'Giropay',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Giropay',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### AfterpayClearpay

Before:

```js
{
  type: 'AfterpayClearpay',
  shippingDetails: ShippingDetails,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'AfterpayClearpay',
  paymentMethodData: {
    shippingDetails: ShippingDetails,
    billingDetails: BillingDetails,
  }
}
```

### Klarna

Before:

```js
{
  type: 'Klarna',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Klarna',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### Eps

Before:

```js
{
  type: 'Eps',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'Eps',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### P24

Before:

```js
{
  type: 'P24',
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'P24',
  paymentMethodData: {
    billingDetails: BillingDetails,
  }
}
```

### WeChatPay

Before:

```js
{
  type: 'WeChatPay',
  appId: string,
  billingDetails: BillingDetails,
}
```

After

```js
{
  paymentMethodType: 'WeChatPay',
  paymentMethodData: {
    appId: string,
    billingDetails: BillingDetails,
  }
}
```

### AuBecsDebit

Before:

```js
{
  type: 'AuBecsDebit',
  formDetails: FormDetails,
}
```

After

```js
{
  paymentMethodType: 'AuBecsDebit',
  paymentMethodData: {
    formDetails: FormDetails,
  }
}
```

### USBankAccount

Before:

```js
{
  type: 'USBankAccount',
  billingDetails: BillingDetails,
  accountNumber: string,
  routingNumber: string,
  accountHolderType: BankAcccountHolderType,
  accountType: BankAcccountType,
}
```

After

```js
{
  paymentMethodType: 'USBankAccount',
  paymentMethodData: {
    billingDetails: BillingDetails,
    accountNumber: string,
    routingNumber: string,
    accountHolderType: BankAcccountHolderType,
    accountType: BankAcccountType,
  }
}
```

## Why did you make this change? It's annoying for me to have to make these adjustments.

We completely understand, especially since this basically just feels like a rename. And if you're not using TypeScript, then this migration is much harder.

This change will help us smoothly add in future payment methods with multiple "attach" options, like we've done with the new `USBankAccount` payment method. It also more closely matches parameters used in `stripe-js`, so our hope is to make the experience in using that JS library and this one very similar and intuitive.
