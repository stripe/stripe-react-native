import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  initStripe,
  LinkController,
  LinkControllerError,
  PaymentSheet,
  useLinkController,
  type PaymentMethod,
} from '@stripe/stripe-react-native';

type IntentMode = 'sdk-managed' | 'server-setup-intent';
import Button from '../components/Button';
import { colors } from '../colors';

const BASE_URL = 'https://link-controller-preview-demo.stripedemos.com';

interface PaymentMethodInfo {
  id: string;
  type: string;
  card?: { brand: string; last4: string };
  us_bank_account?: { bank_name: string; last4: string };
  link?: { email: string };
}

interface PaymentIntentResponse {
  status: string;
  paymentIntentId: string;
  clientSecret?: string;
  code?: string;
}

async function fetchOrCreateCustomer(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`POST /customers failed: ${res.status}`);
  const { customerId } = await res.json();
  return customerId;
}

async function listPaymentMethods(
  customerId: string
): Promise<PaymentMethodInfo[]> {
  const res = await fetch(
    `${BASE_URL}/payment-methods?customerId=${encodeURIComponent(customerId)}`
  );
  if (!res.ok) throw new Error(`GET /payment-methods failed: ${res.status}`);
  const data = await res.json();
  return data.paymentMethods ?? [];
}

async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/payment-methods/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId, customerId }),
  });
  if (!res.ok)
    throw new Error(`POST /payment-methods/attach failed: ${res.status}`);
}

async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE /payment-methods failed: ${res.status}`);
}

async function createPaymentIntent(
  paymentMethodId: string,
  customerId: string
): Promise<PaymentIntentResponse> {
  const res = await fetch(`${BASE_URL}/payment-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId, customerId }),
  });
  if (!res.ok && res.status !== 402)
    throw new Error(`POST /payment-intents failed: ${res.status}`);
  return res.json();
}

async function createSetupIntent(
  customerId: string
): Promise<{ clientSecret: string }> {
  const res = await fetch(`${BASE_URL}/setup-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
  });
  if (!res.ok) throw new Error(`POST /setup-intents failed: ${res.status}`);
  return res.json();
}

async function pollPaymentIntent(
  piId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<PaymentIntentResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE_URL}/payment-intents/${piId}`);
    if (!res.ok) throw new Error(`GET /payment-intents failed: ${res.status}`);
    const data: PaymentIntentResponse = await res.json();
    if (data.status !== 'processing') return data;
    if (i < maxAttempts - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error('Payment intent still processing after max attempts');
}

function displayLabel(pm: PaymentMethodInfo): string {
  if (pm.card) {
    const brand =
      pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
    return `${brand} •••• ${pm.card.last4}`;
  }
  if (pm.us_bank_account) {
    return `${pm.us_bank_account.bank_name} •••• ${pm.us_bank_account.last4}`;
  }
  if (pm.link) return `Link (${pm.link.email})`;
  return pm.type;
}

export default function LinkControllerScreen() {
  const {
    loading,
    initLinkController,
    presentLinkController,
    confirmLinkControllerSetupIntent,
  } = useLinkController();

  const [stripeReady, setStripeReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cardEnabled, setCardEnabled] = useState(true);
  const [bankEnabled, setBankEnabled] = useState(true);
  const [useCustomAppearance, setUseCustomAppearance] = useState(false);
  const [collectName, setCollectName] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [preview, setPreview] =
    useState<LinkController.PaymentMethodPreview | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod.Result | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    PaymentMethodInfo[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intentMode, setIntentMode] = useState<IntentMode>('sdk-managed');
  const [pendingPaymentMethod, setPendingPaymentMethod] =
    useState<PaymentMethod.Result | null>(null);
  const [linkOnly, setLinkOnly] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const response = await fetch(`${BASE_URL}/config`);
        const { publishableKey } = await response.json();
        await initStripe({
          publishableKey,
          merchantIdentifier: 'merchant.com.stripe.react.native',
          urlScheme: 'com.stripe.react.native',
          setReturnUrlSchemeOnAndroid: true,
        });
        setStripeReady(true);
      } catch (e: any) {
        showStatus(`Bootstrap failed: ${e?.message ?? e}`, true);
        setStripeReady(true);
      }
    }
    bootstrap();
  }, []);

  const showStatus = (message: string, isError = false) => {
    setStatusMessage(message);
    setStatusIsError(isError);
  };

  const handleInit = useCallback(async () => {
    if (!email) {
      Alert.alert(
        'Email required',
        'Enter an email address before initializing.'
      );
      return;
    }

    setInitialized(false);
    setPreview(null);
    setPaymentMethod(null);
    setStatusMessage(null);
    setSavedPaymentMethods([]);

    let cId: string;
    try {
      cId = await fetchOrCreateCustomer(email);
      setCustomerId(cId);
    } catch (e: any) {
      showStatus(`Customer lookup failed: ${e?.message ?? e}`, true);
      return;
    }

    const supportedTypes = [
      ...(cardEnabled ? [LinkController.LinkPaymentMethodType.Card] : []),
      ...(bankEnabled
        ? [LinkController.LinkPaymentMethodType.BankAccount]
        : []),
    ];

    const { error } = await initLinkController({
      email,
      merchantDisplayName: 'Example, Inc.',
      phoneNumber: phone || undefined,
      supportedPaymentMethodTypes: supportedTypes,
      appearance: useCustomAppearance
        ? {
            style: 'ALWAYS_DARK',
            lightColors: {
              primary: '#7B2FBE',
              contentOnPrimary: '#FFFFFF',
              borderSelected: '#7B2FBE',
            },
            darkColors: {
              primary: '#A855F7',
              contentOnPrimary: '#FFFFFF',
              borderSelected: '#A855F7',
            },
            primaryButton: { cornerRadius: 4 },
          }
        : undefined,
      billingDetailsCollectionConfiguration: collectName
        ? { name: PaymentSheet.CollectionMode.ALWAYS }
        : undefined,
      paymentMethodTypes: linkOnly ? ['link'] : undefined,
    });

    if (error) {
      showStatus(`Init failed: ${error.message}`, true);
      return;
    }

    try {
      const pms = await listPaymentMethods(cId);
      setSavedPaymentMethods(pms);
    } catch (e: any) {
      // Non-fatal — proceed with empty list
    }

    setInitialized(true);
    showStatus('Initialized successfully.');
  }, [
    bankEnabled,
    cardEnabled,
    collectName,
    email,
    initLinkController,
    linkOnly,
    phone,
    useCustomAppearance,
  ]);

  const handlePresent = async () => {
    setStatusMessage(null);
    setPendingPaymentMethod(null);
    const result = await presentLinkController();

    if (result.error) {
      if (result.error.code === LinkControllerError.Canceled) {
        showStatus('Canceled.');
      } else {
        showStatus(`Present failed: ${result.error.message}`, true);
      }
      return;
    }

    setPaymentMethod(result.paymentMethod);
    setPreview(result.paymentMethodPreview ?? null);

    if (intentMode === 'server-setup-intent') {
      setPendingPaymentMethod(result.paymentMethod);
      showStatus('Payment method selected. Tap "Confirm & Save" to save it.');
      return;
    }

    if (customerId) {
      try {
        await attachPaymentMethod(result.paymentMethod.id, customerId);
        const pms = await listPaymentMethods(customerId);
        setSavedPaymentMethods(pms);
        showStatus(`Payment method saved: ${result.paymentMethod.id}`);
      } catch (e: any) {
        showStatus(`Attach failed: ${e?.message ?? e}`, true);
      }
    } else {
      showStatus(`Payment method created: ${result.paymentMethod.id}`);
    }
  };

  const handleConfirm = async () => {
    if (!customerId || !pendingPaymentMethod) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const { clientSecret } = await createSetupIntent(customerId);
      const result = await confirmLinkControllerSetupIntent(clientSecret);
      if (result.error) {
        if (result.error.code === LinkControllerError.Canceled) {
          showStatus('Confirmation canceled.');
        } else {
          showStatus(`Confirm failed: ${result.error.message}`, true);
        }
        return;
      }
      const pms = await listPaymentMethods(customerId);
      setSavedPaymentMethods(pms);
      setPendingPaymentMethod(null);
      showStatus('Payment method confirmed and saved.');
    } catch (e: any) {
      showStatus(`Confirm failed: ${e?.message ?? e}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCharge = async (pmId: string) => {
    if (!customerId) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      let piResult = await createPaymentIntent(pmId, customerId);
      if (piResult.status === 'processing') {
        showStatus('Payment processing, polling for status...');
        piResult = await pollPaymentIntent(piResult.paymentIntentId);
      }
      if (piResult.status === 'succeeded') {
        showStatus(`Payment succeeded! (${piResult.paymentIntentId})`);
      } else {
        showStatus(
          `Payment status: ${piResult.status}${piResult.code ? ` (${piResult.code})` : ''}`,
          piResult.status !== 'succeeded'
        );
      }
    } catch (e: any) {
      showStatus(`Charge failed: ${e?.message ?? e}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (pmId: string) => {
    if (!customerId) return;
    setIsProcessing(true);
    try {
      await detachPaymentMethod(pmId);
      const pms = await listPaymentMethods(customerId);
      setSavedPaymentMethods(pms);
      showStatus('Payment method removed.');
    } catch (e: any) {
      showStatus(`Remove failed: ${e?.message ?? e}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setInitialized(false);
    setEmail('');
    setPhone('');
    setCardEnabled(true);
    setBankEnabled(true);
    setUseCustomAppearance(false);
    setCollectName(false);
    setPreview(null);
    setPaymentMethod(null);
    setStatusMessage(null);
    setCustomerId(null);
    setSavedPaymentMethods([]);
    setPendingPaymentMethod(null);
  };

  if (!stripeReady) {
    return <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />;
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Text style={styles.sectionTitle}>Customer</Text>
      <TextInput
        style={styles.input}
        placeholder="Email (required)"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone (optional, E.164)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {customerId ? (
        <Text style={styles.customerIdText}>Customer: {customerId}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Intent Mode</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segment,
            intentMode === 'sdk-managed' && styles.segmentActive,
          ]}
          onPress={() => setIntentMode('sdk-managed')}
        >
          <Text
            style={[
              styles.segmentText,
              intentMode === 'sdk-managed' && styles.segmentTextActive,
            ]}
          >
            SDK Managed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segment,
            intentMode === 'server-setup-intent' && styles.segmentActive,
          ]}
          onPress={() => setIntentMode('server-setup-intent')}
        >
          <Text
            style={[
              styles.segmentText,
              intentMode === 'server-setup-intent' && styles.segmentTextActive,
            ]}
          >
            Server SetupIntent
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Payment Method Types</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Card</Text>
        <Switch value={cardEnabled} onValueChange={setCardEnabled} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Bank Account</Text>
        <Switch value={bankEnabled} onValueChange={setBankEnabled} />
      </View>
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>Link Only</Text>
          <Text style={styles.switchSubLabel}>
            Passes paymentMethodTypes: ['link']
          </Text>
        </View>
        <Switch value={linkOnly} onValueChange={setLinkOnly} />
      </View>

      <Text style={styles.sectionTitle}>Appearance &amp; Billing</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Use Custom Appearance</Text>
        <Switch
          value={useCustomAppearance}
          onValueChange={setUseCustomAppearance}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Always Collect Name</Text>
        <Switch value={collectName} onValueChange={setCollectName} />
      </View>

      <Button
        variant="primary"
        title="Initialize"
        loading={loading && !initialized}
        onPress={handleInit}
      />
      <Button
        variant="primary"
        title="Present"
        loading={loading && initialized}
        disabled={!initialized}
        onPress={handlePresent}
      />
      {pendingPaymentMethod && (
        <Button
          variant="primary"
          title="Confirm & Save"
          loading={isProcessing}
          disabled={isProcessing}
          onPress={handleConfirm}
        />
      )}
      <Button title="Reset" onPress={handleReset} />

      {statusMessage && (
        <Text style={[styles.status, statusIsError && styles.statusError]}>
          {statusMessage}
        </Text>
      )}

      {savedPaymentMethods.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
          {savedPaymentMethods.map((pm) => (
            <View key={pm.id} style={styles.pmRow}>
              <Text style={styles.pmLabel}>{displayLabel(pm)}</Text>
              <View style={styles.pmActions}>
                <TouchableOpacity
                  style={styles.pmActionButton}
                  disabled={isProcessing}
                  onPress={() => handleCharge(pm.id)}
                >
                  <Text style={styles.pmActionText}>Pay $10.99</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pmActionButtonDanger}
                  disabled={isProcessing}
                  onPress={() => handleRemove(pm.id)}
                >
                  <Text style={styles.pmActionTextDanger}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {(preview || paymentMethod) && (
        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Selected Payment Method</Text>
          {preview ? (
            <View style={styles.previewRow}>
              <Image
                source={{ uri: preview.icon }}
                style={styles.previewIcon}
                resizeMode="contain"
              />
              <View style={styles.previewLabels}>
                <Text style={styles.previewLabel}>{preview.label}</Text>
                {preview.sublabel && (
                  <Text style={styles.previewSublabel}>{preview.sublabel}</Text>
                )}
              </View>
            </View>
          ) : null}
          {paymentMethod && (
            <Text style={styles.previewId}>ID: {paymentMethod.id}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  customerIdText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontFamily: 'Courier',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate,
    overflow: 'hidden',
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.slate,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate,
  },
  segmentTextActive: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  status: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
    color: '#1e6b3a',
    fontSize: 14,
  },
  statusError: {
    backgroundColor: '#fdecea',
    color: '#c0392b',
  },
  savedSection: {
    marginTop: 24,
    marginBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  pmLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  pmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pmActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate,
  },
  pmActionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  pmActionButtonDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  pmActionTextDanger: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
  },
  previewCard: {
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    width: 32,
    height: 22,
    marginRight: 12,
  },
  previewLabels: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  previewSublabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  previewId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Courier',
  },
});
