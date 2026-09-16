import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CheckoutPaymentElementView,
  initStripe,
  useCheckout,
} from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native';
import Button from '../../components/Button';
import {
  createCheckoutSession,
  defaultSessionParameters,
  fetchCheckoutPublishableKey,
} from './backend';

const defaultConfiguration: Omit<Checkout.CreateOptions, 'clientSecret'> = {
  returnURL: 'com.stripe.react.native://safepay',
  merchantDisplayName: 'Checkout playground',
  paymentElement: { link: { display: 'never' } },
};

export default function CheckoutPlaygroundScreen() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchCheckoutPublishableKey()
      .then(async (publishableKey) => {
        if (!active) {
          return;
        }
        await initStripe({
          publishableKey,
          merchantIdentifier: 'merchant.com.stripe.react.native',
          urlScheme: 'com.stripe.react.native',
        });
        if (active) {
          setReady(true);
        }
      })
      .catch((failure: Error) => {
        if (active) {
          setError(failure.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Checkout Sessions</Text>
      <Text>Test mode. Configuration changes apply on creation or reload.</Text>
      {!!error && <Text selectable>{error}</Text>}
      {!ready && !error && <Text>Connecting to the test backend…</Text>}
      {ready && <CheckoutForm />}
    </ScrollView>
  );
}

function CheckoutForm() {
  const [enabled, setEnabled] = useState(false);
  const [inline, setInline] = useState(false);
  const [editConfiguration, setEditConfiguration] = useState(false);
  const [configuration, setConfiguration] = useState(
    JSON.stringify(defaultConfiguration, null, 2)
  );
  const [sessionParameters, setSessionParameters] = useState(
    JSON.stringify(defaultSessionParameters, null, 2)
  );
  const [email, setEmail] = useState('updated@example.com');
  const [promotionCode, setPromotionCode] = useState('SAVE10');
  const [address, setAddress] = useState(
    JSON.stringify(
      {
        name: 'Jenny Rosen',
        address: {
          country: 'US',
          postalCode: '94107',
          line1: '510 Townsend St',
          city: 'San Francisco',
          state: 'CA',
        },
      },
      null,
      2
    )
  );
  const [serverURL, setServerURL] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [snapshotVisible, setSnapshotVisible] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const checkout = useCheckout({
    enabled,
    getConfiguration: async () => {
      const params = JSON.parse(configuration) as Checkout.CreateOptions;
      if (
        params.paymentElement?.rowSelectionBehavior?.type === 'immediateAction'
      ) {
        params.paymentElement.rowSelectionBehavior.onSelectPaymentOption = () =>
          setLastAction('Native payment option selected');
      }
      const clientSecret =
        params.clientSecret ||
        (await createCheckoutSession(JSON.parse(sessionParameters)));
      return { ...params, clientSecret };
    },
  });
  const run = (label: string, operation: () => Promise<unknown>) => {
    setLastAction(`${label}: pending`);
    operation()
      .then((result) => {
        setLastAction(`${label}: ${result ? JSON.stringify(result) : 'done'}`);
      })
      .catch((failure: unknown) => {
        setLastAction(
          `${label}: ${failure instanceof Error ? failure.message : String(failure)}`
        );
      });
  };
  const action = (label: string, operation: () => Promise<unknown>) => (
    <Button
      title={label}
      disabled={!checkout.session}
      onPress={() => run(label, operation)}
    />
  );
  return (
    <View style={styles.panel}>
      <Text testID="checkout-status">Status: {checkout.status}</Text>
      <Text testID="checkout-session">
        Session: {checkout.session?.id ?? 'none'}
      </Text>
      {!!checkout.error && (
        <Text selectable testID="checkout-error">
          {checkout.error.message}
        </Text>
      )}
      <Text testID="checkout-action" selectable>
        {lastAction}
      </Text>
      <Button
        title="Create session"
        disabled={enabled}
        onPress={() => setEnabled(true)}
      />
      <Button
        title="Reload"
        disabled={!enabled}
        onPress={() => run('Reload', checkout.reload)}
      />
      <Button
        title="Reset"
        disabled={!enabled}
        onPress={() => setEnabled(false)}
      />
      <Button
        title={editConfiguration ? 'Hide configuration' : 'Edit configuration'}
        onPress={() => setEditConfiguration(!editConfiguration)}
      />
      {editConfiguration && (
        <>
          <Text>
            Native configuration. Edit any CreateOptions field. A clientSecret
            skips session creation.
          </Text>
          <TextInput
            style={styles.json}
            multiline
            scrollEnabled={false}
            autoCapitalize="none"
            value={configuration}
            onChangeText={setConfiguration}
            accessibilityLabel="Configuration"
          />
          <Text>Session creation parameters</Text>
          <TextInput
            style={styles.json}
            multiline
            scrollEnabled={false}
            autoCapitalize="none"
            value={sessionParameters}
            onChangeText={setSessionParameters}
            accessibilityLabel="Session parameters"
          />
        </>
      )}
      <Button
        title={inline ? 'Hide inline element' : 'Show inline element'}
        onPress={() => setInline(!inline)}
      />
      {inline && checkout.paymentElement && (
        <CheckoutPaymentElementView element={checkout.paymentElement} />
      )}
      {action('Present sheet', async () => checkout.paymentElement?.present())}
      {action('Confirm', checkout.confirm)}
      <Button
        title={showUpdates ? 'Hide session updates' : 'Session updates'}
        onPress={() => setShowUpdates(!showUpdates)}
      />
      {showUpdates && (
        <>
          <Text>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
          />
          {action('Update email', () => checkout.updateEmail(email))}
          {action('Clear email', () => checkout.updateEmail(null))}
          <Text>Shipping address</Text>
          <TextInput
            style={styles.json}
            multiline
            scrollEnabled={false}
            autoCapitalize="none"
            value={address}
            onChangeText={setAddress}
            accessibilityLabel="Shipping address"
          />
          {action('Update shipping', async () =>
            checkout.updateShippingAddress(JSON.parse(address))
          )}
          {action('Clear shipping', () =>
            checkout.updateShippingAddress({ address: null })
          )}
          <Text>Promotion code</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={promotionCode}
            onChangeText={setPromotionCode}
            accessibilityLabel="Promotion code"
          />
          {action('Apply promotion', () =>
            checkout.applyPromotionCode(promotionCode)
          )}
          {action('Remove promotion', checkout.removePromotionCode)}
          {action('Clear payment option', checkout.clearPaymentOption)}
          <Text>
            Server update URL. Leave empty to refresh without a server mutation.
          </Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={serverURL}
            onChangeText={setServerURL}
            accessibilityLabel="Server update URL"
          />
          {action('Fail server update', () =>
            checkout.runServerUpdate(async () => {
              throw new Error('Server rejected update');
            })
          )}
          {action('Slow server update', () =>
            checkout.runServerUpdate(
              () => new Promise<void>((resolve) => setTimeout(resolve, 10_000))
            )
          )}
          {action('Server refresh', () =>
            checkout.runServerUpdate(async () => {
              if (serverURL) {
                const response = await fetch(serverURL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ session_id: checkout.session?.id }),
                });
                if (!response.ok) {
                  throw new Error(`Server update failed (${response.status})`);
                }
              }
            })
          )}
        </>
      )}
      <Text testID="checkout-action-footer" selectable>
        {lastAction}
      </Text>
      <Button
        title={snapshotVisible ? 'Hide session' : 'Show session'}
        onPress={() => setSnapshotVisible(!snapshotVisible)}
      />
      {snapshotVisible && (
        <>
          <Text style={styles.heading}>Session snapshot</Text>
          <Text selectable testID="checkout-snapshot">
            {JSON.stringify(
              checkout.session,
              (key, value) => (key === 'image' ? '[Base64 image]' : value),
              2
            )}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16 },
  panel: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  heading: { fontSize: 20, fontWeight: '600', marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    marginVertical: 6,
    color: '#111',
  },
  json: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    marginVertical: 6,
    minHeight: 90,
    textAlignVertical: 'top',
    color: '#111',
  },
});
