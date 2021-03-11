# Digital wallets

Learn how to add cards to digital wallets.

## 1. Request Access

### Android

Stripe provides an SDK wrapper around a private Google library for push provisioning. To distribute your app on the Google Pay Store with push provisioning you need to:

- [Request access to Google Pay](https://developers.google.com/pay/issuers/requesting-access?api=true)
- Download Google’s [TapAndPay private SDK](https://developers.google.com/pay/issuers/apis/push-provisioning/android/releases) (current compatible version is 17.0.1)

### iOS

Push provisioning requires a special entitlement from Apple called `com.apple.developer.payment-pass-provisioning`. You can request it by emailing [push-provisioning-requests@stripe.com](mailto:push-provisioning-requests@stripe.com). In your email, include your:

- App name
- Developer team ID, found at https://developer.apple.com/account/#/membership
- ADAM ID (your app’s unique numeric ID), found in [App Store Connect](https://appstoreconnect.apple.com/) or in the App Store link to your app, e.g.,: https://apps.apple.com/app/id123456789

## 2. Update you App

Determine if the device is eligible to use push provisioning by checking `isPaymentPassSupported` property from `useStripe` hook.
You can use this to show or hide a `AddPassButton` component. When the user taps the button, call `presentPaymentPass` method to present view which contains Apple’s UI for the push provisioning flow.

```tsx
// ...
const present = async () => {
  if (!isPaymentPassSupported) {
    return;
  }

  const { apiVersion, error, cardTokenId } = await presentPaymentPass({
    name: 'name',
    description: 'description',
    last4: '4242',
    brand: 'Visa',
  });
  // ...
};
```

Next, make an API call to your backend to create an Ephemeral Key. Your backend creates an Ephemeral Key object using the Stripe API, and returns it to your app. Your app then calls `completeCreatingIssueingCardKey` handler with your backend’s API response.

```tsx
// ...
const ephemeralKey = await fetchEphemeralKeyFromBackend({
  apiVersion,
  issuingCard: 'card_id',
});
const { error } = await completeCreatingIssueingCardKey(ephemeralKey);

if (error) {
  Alert.alert(`Error code: ${error.code}`, error.message);
} else {
  Alert.alert('Success');
}
// ...
```

## 3. Update you backend

## 4. iOS Testing

The `com.apple.developer.payment-pass-provisioning` entitlement only works with distribution provisioning profiles, meaning even after you obtain it, the only way to test the end-to-end push provisioning flow is by distributing your app with TestFlight or the App Store on iOS.

To make testing easier, we provide a mock version of PKAddPaymentPassViewController called STPFakeAddPaymentPassViewController that can be used interchangeably during testing. You can enable the test mode by providing `test` flag to `presentPaymentPass` method.

```tsx
// ...
const present = async () => {
  // ...
  const { apiVersion, error, cardTokenId } = await presentPaymentPass({
    name: 'name',
    description: 'description',
    last4: '4242',
    brand: 'Visa',
    testMode: true,
  });
  // ...
};
```
