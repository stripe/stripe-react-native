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
  View,
} from 'react-native';
import {
  initStripe,
  LinkController,
  LinkControllerError,
  useLinkController,
  type PaymentMethod,
} from '@stripe/stripe-react-native';
import Button from '../components/Button';
import { colors } from '../colors';

const CONFIG_URL =
  'https://link-controller-preview-demo.stripedemos.com/config';

export default function LinkControllerScreen() {
  const { loading, initLinkController, presentLinkController } =
    useLinkController();

  const [stripeReady, setStripeReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cardEnabled, setCardEnabled] = useState(true);
  const [bankEnabled, setBankEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [preview, setPreview] =
    useState<LinkController.PaymentMethodPreview | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod.Result | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const response = await fetch(CONFIG_URL);
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
    });

    if (error) {
      showStatus(`Init failed: ${error.message}`, true);
    } else {
      setInitialized(true);
      showStatus('Initialized successfully.');
    }
  }, [bankEnabled, cardEnabled, email, phone, initLinkController]);

  const handlePresent = async () => {
    setStatusMessage(null);
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
    showStatus(`Payment method created: ${result.paymentMethod.id}`);
  };

  const handleReset = () => {
    setInitialized(false);
    setEmail('');
    setPhone('');
    setCardEnabled(true);
    setBankEnabled(true);
    setPreview(null);
    setPaymentMethod(null);
    setStatusMessage(null);
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

      <Text style={styles.sectionTitle}>Payment Method Types</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Card</Text>
        <Switch value={cardEnabled} onValueChange={setCardEnabled} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Bank Account</Text>
        <Switch value={bankEnabled} onValueChange={setBankEnabled} />
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
      <Button title="Reset" onPress={handleReset} />

      {statusMessage && (
        <Text style={[styles.status, statusIsError && styles.statusError]}>
          {statusMessage}
        </Text>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
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
  previewCard: {
    marginTop: 16,
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
