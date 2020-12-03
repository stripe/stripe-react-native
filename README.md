# react-native-stripe-sdk

Stripe SDK for React Native

## Installation

```sh
yarn add react-native-stripe-sdk
```

### iOS

For iOS you will have to run `pod install` in `ios` directory to install native dependencies.

## Usage example

```js
// App.ts
import { StripeProvider } from 'react-native-stripe-sdk';

<StripeProvider
  publishableKey={publishableKey}
  merchantIdentifier="merchant.identifier"
>
  <PaymentScreen />
</StripeProvider>;

// PaymentScreen.ts
import { CardField, useStripe } from 'react-native-stripe-sdk';

export default function PaymentScreen() {
  const [card, setCard] = (useState < CardDetails) | (null > null);
  const { confirmPayment, handleNextPaymentAction } = useStripe();

  return (
    <CardField
      defaultValue={{
        cardNumber: '4242424242424242',
        cvc: '424',
        expiryMonth: 3,
        expiryYear: 22,
      }}
      onCardChange={setCard}
    />
  );
}
```

## Stripe initialisation

// TODO: documentation here

## Run example app

- `cd ./example`
- `yarn or npm install`
- for ios you have to run `pod install` in `ios` directory
- create `.env` file with mandatory variables (look at `.env.example`)
- `yarn start:server`
- `yarn ios`/`yarn android`

##### additionall steps for webhook example

- [install `stripe-cli`](https://stripe.com/docs/stripe-cli)
- run command `stripe listen --forward-to localhost:4242/webhook`

## Guides

- [Accept a payment - classic](./docs/accept-a-payment.md)
- [Accept a payment - integration builder](./docs/accept-a-payment-integration.md)
- [3D secure](./docs/3d-secure.md)
- [Apple Pay](./docs/apple-pay.md)
- [Set up future payments](./docs/set-up-future-payments.md)

## API reference

You can find API reference [here](./docs/reference.md)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
