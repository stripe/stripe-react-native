import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  initStripe,
  useFinancialConnectionsSheet,
} from '@stripe/stripe-react-native';
import type { FinancialConnections } from '@stripe/stripe-react-native';
import { setFinancialConnectionsForceNativeFlow } from '@stripe/stripe-react-native/src/functions';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import {
  API_URL,
  FINANCIAL_CONNECTIONS_API_URL,
  FINANCIAL_CONNECTIONS_CUSTOM_PK,
  FINANCIAL_CONNECTIONS_CUSTOM_SK,
} from '../Config';
import type { FinancialConnectionsEvent } from '@stripe/stripe-react-native/src/types/FinancialConnections';

// The financial_connections_pre_collected_consent preview isn't enabled on
// the demo backend's default merchant, so route pre-collected consent
// requests through custom_keys when a demo account is configured locally.
const DEMO_CONFIGURATION = FINANCIAL_CONNECTIONS_CUSTOM_SK
  ? {
      merchant: 'custom_keys',
      test_mode: true,
      custom_public_key: FINANCIAL_CONNECTIONS_CUSTOM_PK,
      custom_secret_key: FINANCIAL_CONNECTIONS_CUSTOM_SK,
    }
  : {
      merchant: 'default',
      test_mode: true,
    };

type AccountHolder =
  | { type: 'customer'; customer: string }
  | { type: 'account'; account: string };

type IssuedConsent = {
  id: string;
  consentText: string;
  locale: string;
  expiresAt: number;
};

type PendingConsent = {
  accountHolder: AccountHolder;
  consent: IssuedConsent;
  launchMode: 'session' | 'token';
};

async function postDemoBackend<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${FINANCIAL_CONNECTIONS_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error(result.error ?? `Request failed with ${response.status}`);
  }
  return result;
}

export default function CollectBankAccountScreen() {
  const [clientSecret, setClientSecret] = React.useState('');
  const [forceNativeFlow, setForceNativeFlow] = React.useState(false);
  const [usePreCollectedConsent, setUsePreCollectedConsent] =
    React.useState(false);
  const [consentLocale, setConsentLocale] = React.useState('');
  const [pendingConsent, setPendingConsent] =
    React.useState<PendingConsent | null>(null);
  const [consentLoading, setConsentLoading] = React.useState(false);
  const {
    loading,
    collectBankAccountToken,
    collectFinancialConnectionsAccounts,
  } = useFinancialConnectionsSheet();

  React.useEffect(() => {
    fetchClientSecret();
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      setFinancialConnectionsForceNativeFlow(forceNativeFlow);
    }
  }, [forceNativeFlow]);

  React.useEffect(() => {
    return () => {
      if (Platform.OS === 'ios') {
        setFinancialConnectionsForceNativeFlow(false);
      }
    };
  }, []);

  const fetchClientSecret = async () => {
    const response = await fetch(`${API_URL}/financial-connections-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { clientSecret: secret, error } = await response.json();
    if (error) {
      Alert.alert('Error fetching client secret: ', error);
    } else {
      setClientSecret(secret);
    }
  };

  const collectToken = async (
    secret: string,
    preCollectedConsent?: FinancialConnections.PreCollectedConsent
  ) => {
    const { session, token, error } = await collectBankAccountToken(secret, {
      preCollectedConsent,
      onEvent: (event: FinancialConnectionsEvent) => {
        console.log('Event received:', event);
      },
    });

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log(error);
    } else {
      Alert.alert('Success');
      console.log(
        'Successfully obtained session: ',
        JSON.stringify(session, null, 2)
      );
      console.log(
        'Successfully obtained token: ',
        JSON.stringify(token, null, 2)
      );
    }
  };

  const collectSession = async (
    secret: string,
    preCollectedConsent?: FinancialConnections.PreCollectedConsent
  ) => {
    const { session, error } = await collectFinancialConnectionsAccounts(
      secret,
      {
        preCollectedConsent,
        onEvent: (event: FinancialConnectionsEvent) => {
          console.log('Event received:', event);
          console.log('Institution name:', event.metadata.institutionName);
        },
      }
    );

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      console.log(error);
    } else {
      Alert.alert('Success');
      console.log(
        'Successfully obtained session: ',
        JSON.stringify(session, null, 2)
      );
    }
  };

  const prepareConsent = async (launchMode: 'session' | 'token') => {
    setConsentLoading(true);
    try {
      const holderType = launchMode === 'token' ? 'account' : 'customer';
      const { account_holder: accountHolder } = await postDemoBackend<{
        account_holder: AccountHolder;
      }>('/create_accountholder', {
        ...DEMO_CONFIGURATION,
        type: holderType,
      });
      const result = await postDemoBackend<{
        id: string;
        consent_text: string;
        locale: string;
        expires_at: number;
      }>('/create_consent', {
        ...DEMO_CONFIGURATION,
        account_holder: accountHolder,
        ...(consentLocale ? { locale: consentLocale } : {}),
      });
      setPendingConsent({
        accountHolder,
        consent: {
          id: result.id,
          consentText: result.consent_text,
          locale: result.locale,
          expiresAt: result.expires_at,
        },
        launchMode,
      });
    } catch (error) {
      Alert.alert(
        'Unable to create consent',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setConsentLoading(false);
    }
  };

  const launchWithPendingConsent = async () => {
    if (!pendingConsent) {
      return;
    }

    const collectedAt = Math.floor(Date.now() / 1000);
    if (pendingConsent.consent.expiresAt <= collectedAt) {
      setPendingConsent(null);
      Alert.alert('Consent expired', 'Request new consent and try again.');
      return;
    }

    setConsentLoading(true);
    try {
      const isToken = pendingConsent.launchMode === 'token';
      const result = await postDemoBackend<{
        client_secret: string;
        publishable_key: string;
      }>('/setup_playground', {
        ...DEMO_CONFIGURATION,
        account_holder: pendingConsent.accountHolder,
        use_case: isToken ? 'token' : 'data',
        ...(isToken
          ? { payment_method_permission: true }
          : { balances_permission: true }),
      });
      await initStripe({
        publishableKey: result.publishable_key,
        merchantIdentifier: 'merchant.com.stripe.react.native',
        urlScheme: 'com.stripe.react.native',
        setReturnUrlSchemeOnAndroid: true,
      });
      const preCollectedConsent = {
        consent: pendingConsent.consent.id,
        collectedAt,
      };
      setPendingConsent(null);
      if (isToken) {
        await collectToken(result.client_secret, preCollectedConsent);
      } else {
        await collectSession(result.client_secret, preCollectedConsent);
      }
    } catch (error) {
      Alert.alert(
        'Unable to launch Financial Connections',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setConsentLoading(false);
    }
  };

  const handleCollectTokenPress = async () => {
    if (usePreCollectedConsent) {
      await prepareConsent('token');
    } else {
      await collectToken(clientSecret);
    }
  };

  const handleCollectSessionPress = async () => {
    if (usePreCollectedConsent) {
      await prepareConsent('session');
    } else {
      await collectSession(clientSecret);
    }
  };

  return (
    <View style={styles.screen}>
      <PaymentScreen paymentMethod="us_bank_account">
        {Platform.OS === 'ios' && (
          <View
            style={{
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text>Force native flow</Text>
            <Switch
              value={forceNativeFlow}
              onValueChange={setForceNativeFlow}
              accessibilityLabel="Force native flow"
              testID="force_native_flow_switch"
            />
          </View>
        )}
        <View style={styles.settingRow}>
          <Text>Use pre-collected consent</Text>
          <Switch
            value={usePreCollectedConsent}
            onValueChange={setUsePreCollectedConsent}
            accessibilityLabel="Use pre-collected consent"
            testID="pre_collected_consent_switch"
          />
        </View>
        {usePreCollectedConsent && !FINANCIAL_CONNECTIONS_CUSTOM_SK && (
          <Text style={styles.hint}>
            Enter your demo account keys in example/src/Config.ts
            (FINANCIAL_CONNECTIONS_CUSTOM_PK/SK) to use pre-collected consent.
          </Text>
        )}
        {usePreCollectedConsent && (
          <TextInput
            style={styles.input}
            value={consentLocale}
            onChangeText={setConsentLocale}
            placeholder="Consent locale (optional)"
            autoCapitalize="none"
          />
        )}
        <Button
          variant="primary"
          onPress={handleCollectTokenPress}
          title={!clientSecret ? 'loading...' : 'Collect token'}
          loading={loading || consentLoading}
          disabled={!clientSecret || consentLoading}
        />
        <Button
          variant="primary"
          onPress={handleCollectSessionPress}
          title={!clientSecret ? 'loading...' : 'Collect session'}
          loading={loading || consentLoading}
          disabled={!clientSecret || consentLoading}
        />
      </PaymentScreen>
      {pendingConsent && (
        // Rendered as a sibling of PaymentScreen (not inside its ScrollView,
        // and not a native Modal) so it fills the actual screen and fully
        // disappears before collectToken/collectSession presents the native
        // Financial Connections sheet - stacking two native modal
        // presentations back-to-back causes a blank screen on iOS.
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Financial Connections consent</Text>
          <Text style={styles.locale}>
            Locale: {pendingConsent.consent.locale}
          </Text>
          <ScrollView style={styles.consentTextContainer}>
            <Text selectable>{pendingConsent.consent.consentText}</Text>
          </ScrollView>
          <View style={styles.modalActions}>
            <Button onPress={() => setPendingConsent(null)} title="Cancel" />
            <Button
              variant="primary"
              onPress={launchWithPendingConsent}
              title="Agree and continue"
              loading={consentLoading}
              disabled={consentLoading}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hint: {
    marginBottom: 16,
    color: '#6b7280',
    fontSize: 13,
  },
  settingRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderBottomColor: '#6b7280',
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingVertical: 8,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 64,
    zIndex: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  locale: {
    marginBottom: 16,
  },
  consentTextContainer: {
    flex: 1,
    marginBottom: 16,
  },
  modalActions: {
    gap: 8,
  },
});
