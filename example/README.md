## Stripe React Native example app

### Getting started

Install dependencies

```sh
yarn install
```

#### iOS

Before running the app the first time, or when making changes to native dependencies install pods.

```sh
yarn install-pods
```

#### Server

Create a new `.env` file at the root of the example folder. Copy the content from `.env.example` and change the keys to the ones from your own Stripe account.

### Runing the app

#### iOS

```
yarn ios
```

#### Android

Run the app

```
yarn android
```

### Running the server

The app needs a server to handle stripe api keys.

```
yarn start:server
```

To test webhooks, also start the local listener from the Stripe CLI.

```
stripe listen --forward-to localhost:4242/webhook
```

Note the signing secret (`whsec_...`) and update `STRIPE_WEBHOOK_SECRET` in the `.env` file.
