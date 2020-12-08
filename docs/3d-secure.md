# Card authentication and 3D Secure

## Displaying the 3D Secure Flow

Payment methods support 3D secure out-of-the-box. It works with card payments or setup future payments.

To configure how it behaves and looks like there is a `use3dSecureConfiguration` hook. It takes a configuration object as an argument.

```ts
type ThreeDSecureConfigurationParams = {
  bodyFontSize?: number;
  bodyTextColor?: string;
  headingFontSize?: number;
  headingTextColor?: string;
  timeout?: number;
};
```

Possible ways of configuration:

- `bodyFontSize` (default `11`) - font size of the text
- `bodyTextColor` (default `#000000`) - color of the text
- `headingFontSize` (default `21`) - font size of the text in header
- `headingTextColor` (default `#000000`) - color size of the text in header
- `timeout` (default `5`) - timeout value. It controls how long the 3D Secure authentication process runs before it times out. This duration includes both network round trips and awaiting customer input. Note that this value must be at least 5 minutes in order to remain compliant with Strong Customer Authentication regulation.

Example of usage:

```ts
function PaymentScreen() {
  use3dSecureConfiguration({
    timeout: 5,
    headingTextColor: '#90b43c',
    bodyTextColor: '#000000',
    bodyFontSize: 16,
    headingFontSize: 21,
  });

  // ...
}
```

## Testing the 3D Secure flow

Use a Stripe test card with any CVC, postal code, and future expiration date to trigger 3DS authentication challenge flows while in test mode.
