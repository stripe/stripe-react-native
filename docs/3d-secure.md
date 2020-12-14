# Card authentication and 3D Secure

## Displaying the 3D Secure Flow

Payment methods support 3D secure out-of-the-box. It works with card payments or setup future payments.

To configure how it behaves and looks like there is a `threeDSecureParams` prop in `StripeProvider`. It takes a configuration object as an argument.

```ts
type ThreeDSecureConfigurationParams = Partial<{
  timeout: number;
  label: ThreeDsLabelProps;
  navigationBar: NavigationBarProps;
  textField: ThreeDsTextFieldProps;
  submitButton: ThreeDsSubmitButtonProps;
  backgroundColor: string; // iOS only
  footer: ThreeDSecureFooterProps; // iOS only
  accentColor: string; // Android only
}>;
```

Possible ways of configuration:

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

### ThreeDSecureFooterProps (iOS only)

```ts
type ThreeDSecureFooterProps = {
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

Example of usage:

```tsx
function PaymentScreen() {
  return (
    <StripeProvider
      threeDSecureParams={{
        backgroundColor: '#FFFFFF',
        timeout: 5,
        label: {
          headingTextColor: '#0000',
          headingFontSize: 13,
        },
        navigationBar: {
          headerText: '3d secure',
        },
        footer: {
          backgroundColor: '#FFFFFF',
        },
        submitButton: {
          backgroundColor: '#000000',
          cornerRadius: 12,
          textColor: '#FFFFFF',
          textFontSize: 14,
        },
      }}
    />
  );
  // ...
}
```

## Testing the 3D Secure flow

Use a Stripe test card with any CVC, postal code, and future expiration date to trigger 3DS authentication challenge flows while in test mode.
