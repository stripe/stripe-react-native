# Stripe

To get the content of the Stripe object you have to use `useStripe` hook. This hook returns an object with methods from the below list.

## confirmPayment

Confirms the PaymentIntent with the provided parameters. Call this method if you are using automatic confirmation.

```ts
(
  paymentIntentClientSecret: string,
  data: PaymentMethodData,
  options?: PaymentMethodOptions
) =>  Promise<Intent>
```

### Arguments

- `paymentIntentClientSecret: string` - client secret
- `data: PaymentMethodData` - data needs for particular payment like `type`, `cardDetails` or `billingDetails`
- `options: PaymentMethodOptions` - payment options

### Return value

A promise with `Intent` object.

## createPaymentMethod

Converts a card details object into a Stripe Payment Method using the Stripe API.

```ts
(data: PaymentMethodData, options?: PaymentMethodOptions) => Promise<PaymentMethod>;
```

### Arguments

- `data: PaymentMethodData` - data needs for particular payment like `type`, `cardDetails` or `billingDetails`
- `options: PaymentMethodOptions` - payment options

### Return value

A promise with `PaymentMethod` object.

## handleCardAction

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
  data: PaymentMethodData,
  options?: PaymentMethodOptions
) => Promise<SetupIntent>;
```

### Arguments

- `paymentIntentClientSecret: string` - client secret
- `data: PaymentMethodData` - data needs for particular payment like `type`, `cardDetails` or `billingDetails`
- `options: PaymentMethodOptions` - payment options

### Return value

Promise with `SetupIntent` object.

## threeDSecureParams

```ts
type ThreeDSecureConfigurationParams = Partial<{
  timeout: number;
  label: ThreeDsLabelProps;
  navigationBar: NavigationBarProps;
  textField: ThreeDsTextFieldProps;
  submitButton: ThreeDsSubmitButtonProps;
  backgroundColor: string; // iOS only
  footer: ThreeDsFooterProps; // iOS only
  accentColor: string; // Android only
}>;
```

### Arguments

- `label` - customization for text label
- `navigationBar` - customization for the navigationBar
- `textField` - customization for the textField
- `submitButton` - customization for the submitButton
- `timeout` (default `5`) - timeout value. It controls how long the 3D Secure authentication process runs before it times out. This duration includes both network round trips and awaiting customer input. Note that this value must be at least 5 minutes in order to remain compliant with Strong Customer Authentication regulation.
- `backgroundColor` (iOS only) - color of the screen background
- `footer` (iOS only) - customization for the footer
- `accentColor` (Android only) - color of accents (e.g. loader)

### ThreeDsLabelProps

```ts
type ThreeDsLabelProps = {
  headingTextColor: string;
  textColor: string;
  textFontSize: number;
  headingFontSize: number;
};
```

- `textColor` - color of the text
- `textFontSize` - font size of text
- `headingTextColor` - color of the heading text
- `headingFontSize` - font size of the heading text

### ThreeDsFooterProps (iOS only)

```ts
type ThreeDsFooterProps = {
  backgroundColor: string;
  chevronColor: string;
  headingTextColor: string;
  textColor: string;
};
```

- `backgroundColor` - color of the background
- `chevronColor` - color of the chevron
- `headingTextColor` - color of the heading text
- `textColor` - color of the text

### NavigationBarProps

```ts
type NavigationBarProps = {
  headerText: string;
  buttonText: string;
  textColor: string;
  textFontSize: number;
  statusBarColor: string; // Android only
  backgroundColor: string; // Android only
  barStyle: NavigationBarStyle; // iOS only
  translucent: boolean; // iOS only
  barTintColor: string; // iOS only
};
```

- `headerText` - text displayed in the navigation bar
- `buttonText` - text displayed in the button
- `textColor` - color of the text
- `textFontSize` - font size of the text
- `statusBarColor` (Android only) - color of the status bar
- `backgroundColor` (Android only) - color of the screen background
- `barStyle` (iOS only) - style of the navigation bar ex. default, dark, darkTranslucent
- `translucent` (iOS only) - value indicating whether the navigation bar is translucent or not
- `barTintColor` (iOS only) - background color of the navigation bar

### ThreeDsTextFieldProps

```ts
type ThreeDsTextFieldProps = {
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  textColor: string;
  textFontSize: number;
};
```

- `borderColor` - border color of the text field
- `borderWidth` - border width of the text field
- `cornerRadius` - corner radius of the text field
- `textColor` - color of the text
- `textFontSize` - font size of the text

### ThreeDsSubmitButtonProps

```ts
type ThreeDsSubmitButtonProps = Partial<{
  backgroundColor: string;
  cornerRadius: number;
  textColor: string;
  textFontSize: number;
}>;
```

- `backgroundColor` - background color of the submit button
- `cornerRadius` - corner radius of the ubmit button
- `textColor` - color of the button text
- `textFontSize` - font size of the button text
