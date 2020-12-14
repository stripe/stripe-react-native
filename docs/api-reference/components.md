# Components

## StripeProvider

Stripe initialisation provider. Needed to properly initialise stripe SDK. Should be used to wrap the main application.

```tsx
<StripeProvider
  publishableKey="publishable_key"
  merchantIdentifier="merchant.com.react.native.stripe.sdk"
  threeDSecureParams={{
    timeout: 5,
  }}
>
  // Your app here
</StripeProvider>
```

### Props

#### publishableKey

Publishable key that allows you to authenticate API requests. It is possible to initialise this value with a value you gain asynchronously from your backend.

type: `string`

#### merchantIdentifier _(optional)_

Merchant identifier needed for Apple Pay actions

type: `string`

#### stripeAccountId _(optional)_

Stripe account ID

type: `string`

#### threeDSecureParams _(optional)_

3d secure configuration.
check configuration details [here](../3d-secure.md)

type:

```ts
Partial<{
  timeout: number;
  label: ThreeDsLabelProps;
  navigationBar: NavigationBarProps;
  textField: ThreeDsTextFieldProps;
  submitButton: ThreeDsSubmitButtonProps;
  backgroundColor: string; // iOS only
  footer: ThreeDSecureFooterProps; // iOS only
}>;
```

## CardField

Card field component allowing to collect card details.

![CardField component](../assets/card-field-example.gif 'CardField component')

### props

#### defaultValue _(optional)_

Default value for the card details

type:

```ts
Partial<{
  number: string;
  cvc: string;
  expiryMonth: number;
  expiryYear: number;
}>
```

#### postalCodeEnabled _(optional)_

Indicates if the postal code field is enabled for the card field.

#### onCardChange _(optional)_

Callback that will be called on every card change with Card details.

type: `(card: CardDetails) => void`

#### onFocus _(optional)_

> Android only

Callback that will be called on every card change with the name of the focused field.

type: `(focusedField: Nullable<string>) => void`
