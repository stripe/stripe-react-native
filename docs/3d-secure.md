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
  footer: ThreeDsFooterProps; // iOS only
  accentColor: string; // Android only
}>;
```

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
