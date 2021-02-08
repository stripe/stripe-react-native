# Components

## StripeProvider

Stripe initialisation provider. Needed to properly initialise stripe SDK. Should be used to wrap the main application.

```tsx
<StripeProvider
  publishableKey="publishable_key"
  merchantIdentifier="merchant.com.stripe.react.native"
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
  footer: ThreeDsFooterProps; // iOS only
}>;
```

## CardField

Card field component allowing to collect card details.

![CardField component](../assets/card-field-example.gif 'CardField component')

### props

#### postalCodeEnabled _(optional)_

Indicates if the postal code field is enabled for the card field.

type: `string`

#### onCardChange _(optional)_

Callback that will be called on every card change with Card details.

type: `(card: CardDetails) => void`

#### onFocus _(optional)_

> Android only

Callback that will be called on every card change with the name of the focused field.

type: `(focusedField: Nullable<string>) => void`

## ApplePayButton

Component which provides the Apple Pay button for use inside of your app
and can be used to prompt the user to pay with Apple Pay.

### props

#### onPress

Handler to be called when the user taps the button.

type: `() => void`

#### type

The button type you can display to initiate Apple Pay transactions.

type:

```ts
type ApplePayButtonType =
  | 'plain'
  | 'buy'
  | 'setUp'
  | 'inStore'
  | 'donate'
  | 'checkout'
  | 'book'
  | 'subscribe'
  | 'reload'
  | 'addMoney'
  | 'topUp'
  | 'order'
  | 'rent'
  | 'support'
  | 'contribute'
  | 'tip';
```

#### buttonStyle

The appearance of the apple pay button.

type:

```ts
type ApplePayButtonStyle = 'white' | 'whiteOutline' | 'black' | 'automatic';
```
