// Server code from https://github.com/stripe-samples/accept-a-card-payment/tree/master/using-webhooks/server/node-typescript

import env from 'dotenv';
// Replace if using a different env file or config.
env.config({ path: './.env' });

import bodyParser from 'body-parser';
import express from 'express';

import Stripe from 'stripe';
import { generateResponse } from './utils';

const striptSecretKey = process.env.STRIPE_SECRET_KEY || '';
const striptPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(striptSecretKey, {
  apiVersion: '2020-08-27',
  typescript: true,
});

const app = express();

app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/webhook') {
      next();
    } else {
      bodyParser.json()(req, res, next);
    }
  }
);

// tslint:disable-next-line: interface-name
interface Order {
  items: object[];
}

const calculateOrderAmount = (_order: Order): number => {
  // Replace this constant with a calculation of the order's amount.
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client.
  return 1400;
};

app.get('/stripe-key', (_: express.Request, res: express.Response): void => {
  res.send({ publishableKey: striptPublishableKey });
});

app.post(
  '/create-payment-intent',
  async (req: express.Request, res: express.Response): Promise<void> => {
    const { items, currency }: { items: Order; currency: string } = req.body;
    // Create a PaymentIntent with the order amount and currency.
    const params: Stripe.PaymentIntentCreateParams = {
      amount: calculateOrderAmount(items),
      currency,
    };

    const paymentIntent: Stripe.PaymentIntent = await stripe.paymentIntents.create(
      params
    );

    // Send publishable key and PaymentIntent client_secret to client.
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  }
);

app.post(
  '/pay-without-webhooks',
  async (req: express.Request, res: express.Response): Promise<void> => {
    const {
      paymentMethodId,
      paymentIntentId,
      items,
      currency,
      useStripeSdk,
    }: {
      paymentMethodId: string;
      paymentIntentId: string;
      items: Order;
      currency: string;
      useStripeSdk: boolean;
    } = req.body;

    const orderAmount: number = calculateOrderAmount(items);

    try {
      if (paymentMethodId) {
        // Create new PaymentIntent with a PaymentMethod ID from the client.
        const params: Stripe.PaymentIntentCreateParams = {
          amount: orderAmount,
          confirm: true,
          confirmation_method: 'manual',
          currency,
          payment_method: paymentMethodId,
          // If a mobile client passes `useStripeSdk`, set `use_stripe_sdk=true`
          // to take advantage of new authentication features in mobile SDKs.
          use_stripe_sdk: useStripeSdk,
        };
        const intent = await stripe.paymentIntents.create(params);
        // After create, if the PaymentIntent's status is succeeded, fulfill the order.
        res.send(generateResponse(intent));
      } else if (paymentIntentId) {
        // Confirm the PaymentIntent to finalize payment after handling a required action
        // on the client.
        const intent = await stripe.paymentIntents.confirm(paymentIntentId);
        // After confirm, if the PaymentIntent's status is succeeded, fulfill the order.
        res.send(generateResponse(intent));
      }
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, etc
      // See https://stripe.com/docs/declines/codes for more.
      res.send({ error: e.message });
    }
  }
);

// Expose a endpoint as a webhook handler for asynchronous events.
// Configure your webhook in the stripe developer dashboard:
// https://dashboard.stripe.com/test/webhooks
app.post(
  '/webhook',
  // Use body-parser to retrieve the raw body as a buffer.
  bodyParser.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response): Promise<void> => {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event: Stripe.Event;
    console.log('webhook!', req);
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] || [],
        stripeWebhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      res.sendStatus(400);
      return;
    }

    // Extract the data from the event.
    const data: Stripe.Event.Data = event.data;
    const eventType: string = event.type;

    if (eventType === 'payment_intent.succeeded') {
      // Cast the event into a PaymentIntent to make use of the types.
      const pi: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;

      // Funds have been captured
      // Fulfill any orders, e-mail receipts, etc
      // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
      console.log(`🔔  Webhook received: ${pi.object} ${pi.status}!`);
      console.log('💰 Payment captured!');
    } else if (eventType === 'payment_intent.payment_failed') {
      // Cast the event into a PaymentIntent to make use of the types.
      const pi: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;
      console.log(`🔔  Webhook received: ${pi.object} ${pi.status}!`);
      console.log('❌ Payment failed.');
    }
    res.sendStatus(200);
  }
);

app.listen(4242, (): void =>
  console.log(`Node server listening on port ${4242}!`)
);
