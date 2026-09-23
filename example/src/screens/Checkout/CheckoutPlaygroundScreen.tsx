import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckoutPaymentElementView,
  initStripe,
  useCheckout,
} from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native';
import { colors } from '../../colors';
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
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>TEST MODE</Text>
        <Text style={styles.heading}>Checkout Sessions</Text>
        <Text style={styles.introCopy}>
          Create a session, exercise Checkout, and inspect native SDK state.
        </Text>
      </View>
      {!!error && (
        <View style={[styles.banner, styles.errorBanner]}>
          <Text style={styles.errorTitle}>Could not connect</Text>
          <Text style={styles.errorText} selectable>
            {error}
          </Text>
        </View>
      )}
      {!ready && !error && (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.blurple} />
          <Text style={styles.loadingText}>
            Connecting to the test backend…
          </Text>
        </View>
      )}
      {ready && <CheckoutForm />}
    </ScrollView>
  );
}

type PlaygroundButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  testID?: string;
};

function PlaygroundButton({
  title,
  onPress,
  disabled = false,
  variant = 'secondary',
  testID,
}: PlaygroundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        styles[`${variant}Button`],
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!description && (
          <Text style={styles.sectionDescription}>{description}</Text>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
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
  const action = (
    label: string,
    operation: () => Promise<unknown>,
    variant: PlaygroundButtonProps['variant'] = 'secondary'
  ) => (
    <PlaygroundButton
      title={label}
      disabled={!checkout.session}
      onPress={() => run(label, operation)}
      variant={variant}
    />
  );
  const reset = () => {
    setEnabled(false);
    setInline(false);
    setShowUpdates(false);
    setSnapshotVisible(false);
    setLastAction('');
  };
  const actionPending = lastAction.endsWith(': pending');
  return (
    <View style={styles.panel}>
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusLabelRow}>
            <View
              style={[
                styles.statusDot,
                checkout.status === 'ready' && styles.statusDotReady,
                checkout.status === 'updating' && styles.statusDotUpdating,
              ]}
            />
            <Text style={styles.statusLabel} testID="checkout-status">
              Status: {checkout.status}
            </Text>
          </View>
        </View>
        <Text style={styles.sessionLabel}>SESSION</Text>
        <Text
          style={styles.sessionValue}
          testID="checkout-session"
          selectable
          numberOfLines={1}
        >
          Session: {checkout.session?.id ?? 'none'}
        </Text>
        {!!checkout.error && (
          <View style={[styles.banner, styles.errorBanner, styles.statusError]}>
            <Text selectable testID="checkout-error" style={styles.errorText}>
              {checkout.error.message}
            </Text>
          </View>
        )}
        <View style={styles.activityRow}>
          {actionPending && (
            <ActivityIndicator size="small" color={colors.blurple} />
          )}
          <Text
            testID="checkout-action"
            selectable
            style={[
              styles.activityText,
              !lastAction && styles.activityPlaceholder,
            ]}
          >
            {lastAction || 'No actions yet'}
          </Text>
        </View>
        {enabled && (
          <View style={styles.lifecycleActions}>
            <View style={styles.buttonRowItem}>
              <PlaygroundButton
                title="Reload"
                variant="quiet"
                onPress={() => run('Reload', checkout.reload)}
              />
            </View>
            <View style={styles.buttonRowItem}>
              <PlaygroundButton
                title="Reset"
                variant="danger"
                onPress={reset}
              />
            </View>
          </View>
        )}
      </View>

      <Section
        title="Setup"
        description="Configuration changes apply when a session is created or reloaded."
      >
        <View style={styles.actionStack}>
          <PlaygroundButton
            title={
              editConfiguration ? 'Hide configuration' : 'Edit configuration'
            }
            variant="quiet"
            onPress={() => setEditConfiguration(!editConfiguration)}
          />
        </View>
        {editConfiguration && (
          <View style={styles.disclosureContent}>
            <Text style={styles.helperText}>
              Edit any CreateOptions field. Providing a clientSecret skips
              session creation.
            </Text>
            <FieldLabel>Native configuration</FieldLabel>
            <TextInput
              style={styles.json}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
              value={configuration}
              onChangeText={setConfiguration}
              accessibilityLabel="Configuration"
            />
            <FieldLabel>Session creation parameters</FieldLabel>
            <TextInput
              style={styles.json}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
              value={sessionParameters}
              onChangeText={setSessionParameters}
              accessibilityLabel="Session parameters"
            />
          </View>
        )}
        <View style={styles.primaryAction}>
          <PlaygroundButton
            title="Create session"
            variant="primary"
            disabled={enabled}
            onPress={() => setEnabled(true)}
          />
        </View>
      </Section>

      <Section
        title="Payment"
        description="Present the native sheet or render PaymentElement inline."
      >
        <PlaygroundButton
          title={inline ? 'Hide inline element' : 'Show inline element'}
          variant="quiet"
          disabled={!checkout.session}
          onPress={() => setInline(!inline)}
        />
        {inline && checkout.paymentElement && (
          <View style={styles.nativeElement}>
            <CheckoutPaymentElementView element={checkout.paymentElement} />
          </View>
        )}
        <View style={styles.buttonRow}>
          <View style={styles.buttonRowItem}>
            {action(
              'Present sheet',
              async () => checkout.paymentElement?.present(),
              'secondary'
            )}
          </View>
          <View style={styles.buttonRowItem}>
            {action('Confirm', checkout.confirm, 'primary')}
          </View>
        </View>
      </Section>

      <Section
        title="Update session"
        description="Mutate the active session and exercise server update states."
      >
        <PlaygroundButton
          title={showUpdates ? 'Hide session updates' : 'Session updates'}
          variant="quiet"
          disabled={!checkout.session}
          onPress={() => setShowUpdates(!showUpdates)}
        />
        {showUpdates && (
          <View style={styles.disclosureContent}>
            <FieldLabel>Email</FieldLabel>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonRowItem}>
                {action('Update email', () => checkout.updateEmail(email))}
              </View>
              <View style={styles.buttonRowItem}>
                {action(
                  'Clear email',
                  () => checkout.updateEmail(null),
                  'quiet'
                )}
              </View>
            </View>
            <FieldLabel>Shipping address</FieldLabel>
            <TextInput
              style={styles.json}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              value={address}
              onChangeText={setAddress}
              accessibilityLabel="Shipping address"
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonRowItem}>
                {action('Update shipping', async () =>
                  checkout.updateShippingAddress(JSON.parse(address))
                )}
              </View>
              <View style={styles.buttonRowItem}>
                {action(
                  'Clear shipping',
                  () => checkout.updateShippingAddress({ address: null }),
                  'quiet'
                )}
              </View>
            </View>
            <FieldLabel>Promotion code</FieldLabel>
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
            {action('Remove promotion', checkout.removePromotionCode, 'quiet')}
            {action(
              'Clear payment option',
              checkout.clearPaymentOption,
              'quiet'
            )}
            <FieldLabel>Server update URL</FieldLabel>
            <Text style={styles.helperText}>
              Leave empty to refresh without a server mutation.
            </Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={serverURL}
              onChangeText={setServerURL}
              accessibilityLabel="Server update URL"
            />
            {action('Server refresh', () =>
              checkout.runServerUpdate(async () => {
                if (serverURL) {
                  const response = await fetch(serverURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      session_id: checkout.session?.id,
                    }),
                  });
                  if (!response.ok) {
                    throw new Error(
                      `Server update failed (${response.status})`
                    );
                  }
                }
              })
            )}
            {action('Slow server update', () =>
              checkout.runServerUpdate(
                () =>
                  new Promise<void>((resolve) => setTimeout(resolve, 10_000))
              )
            )}
            {action(
              'Fail server update',
              () =>
                checkout.runServerUpdate(async () => {
                  throw new Error('Server rejected update');
                }),
              'danger'
            )}
          </View>
        )}
      </Section>

      <Section
        title="Diagnostics"
        description="Inspect the latest result and raw Checkout session."
      >
        <View style={styles.activityFooter}>
          <Text style={styles.activityFooterLabel}>LATEST RESULT</Text>
          <Text
            testID="checkout-action-footer"
            selectable
            style={[
              styles.activityText,
              !lastAction && styles.activityPlaceholder,
            ]}
          >
            {lastAction || 'No actions yet'}
          </Text>
        </View>
        <PlaygroundButton
          title={snapshotVisible ? 'Hide session' : 'Show session'}
          variant="quiet"
          disabled={!checkout.session}
          onPress={() => setSnapshotVisible(!snapshotVisible)}
        />
        {snapshotVisible && (
          <View style={styles.snapshot}>
            <Text style={styles.snapshotTitle}>Session snapshot</Text>
            <Text
              selectable
              testID="checkout-snapshot"
              style={styles.snapshotText}
            >
              {JSON.stringify(
                checkout.session,
                (key, value) => (key === 'image' ? '[Base64 image]' : value),
                2
              )}
            </Text>
          </View>
        )}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
    backgroundColor: colors.light_gray,
  },
  intro: { marginBottom: 20 },
  eyebrow: {
    color: colors.blurple,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heading: { color: colors.slate, fontSize: 28, fontWeight: '700' },
  introCopy: {
    color: colors.dark_gray,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  panel: { gap: 24 },
  loadingState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: colors.dark_gray, fontSize: 15 },
  banner: { borderRadius: 12, padding: 14 },
  errorBanner: { backgroundColor: '#FFF0F0' },
  errorTitle: {
    color: '#8B1A1A',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: { color: '#8B1A1A', fontSize: 14, lineHeight: 20 },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  statusHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#8795A1',
  },
  statusDotReady: { backgroundColor: '#0E8A5F' },
  statusDotUpdating: { backgroundColor: '#D97706' },
  statusLabel: { color: colors.slate, fontSize: 16, fontWeight: '700' },
  sessionLabel: {
    color: '#697386',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 8,
  },
  sessionValue: {
    color: colors.slate,
    fontFamily: 'Courier',
    fontSize: 13,
    marginTop: 5,
  },
  statusError: { marginTop: 14 },
  activityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 14,
    paddingTop: 12,
  },
  lifecycleActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 4,
    paddingTop: 8,
  },
  activityText: {
    color: colors.slate,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Courier',
  },
  activityPlaceholder: { color: '#8795A1', fontFamily: undefined },
  section: { gap: 10 },
  sectionHeader: { paddingHorizontal: 4 },
  sectionTitle: { color: colors.slate, fontSize: 18, fontWeight: '700' },
  sectionDescription: {
    color: colors.dark_gray,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  actionStack: { gap: 4 },
  disclosureContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 10,
    paddingTop: 16,
  },
  fieldLabel: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  helperText: { color: colors.dark_gray, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#C7D0D9',
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.slate,
    backgroundColor: colors.white,
    fontSize: 15,
  },
  json: {
    borderWidth: 1,
    borderColor: '#C7D0D9',
    borderRadius: 10,
    padding: 12,
    minHeight: 112,
    textAlignVertical: 'top',
    color: colors.slate,
    backgroundColor: '#FBFCFE',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryAction: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 12,
    paddingTop: 12,
  },
  button: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.blurple },
  secondaryButton: {
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#D8D9FF',
  },
  quietButton: { backgroundColor: 'transparent' },
  dangerButton: { backgroundColor: '#FFF0F0' },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  primaryButtonText: { color: colors.white },
  secondaryButtonText: { color: '#4B45C6' },
  quietButtonText: { color: colors.blurple },
  dangerButtonText: { color: '#B42318' },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  buttonRowItem: { flex: 1 },
  nativeElement: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 8,
    paddingTop: 12,
  },
  activityFooter: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    minHeight: 64,
    padding: 12,
    marginBottom: 6,
  },
  activityFooterLabel: {
    color: '#697386',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  snapshot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    marginTop: 8,
    paddingTop: 14,
  },
  snapshotTitle: {
    color: colors.slate,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  snapshotText: {
    color: colors.slate,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
  },
});
