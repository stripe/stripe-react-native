import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CardField } from '@stripe/stripe-react-native';
import { flush } from 'react-native-coverage';
import NativeCheckoutPaymentElement from '../../../src/specs/NativeCheckoutPaymentElement';
import {
  formatHarnessStatus,
  formatScenarioLine,
  formatScenarioToken,
  withTimeout,
} from '../scripts/harness-format.mjs';
import { registerCheckoutMount } from './checkout-coverage';
import { scenarios } from './scenarios';

type Status = 'running' | 'flushed' | 'flush-failed';

// RN's public SafeAreaView is a plain View on Android, so it does not clear
// the status bar. API 36 edge-to-edge bars are taller than `padding: 16`
// (about 54dp on TestingAVD-4) and taller than StatusBar.currentHeight when
// that constant is still 0. Keep the status line fully below the bar.
const ANDROID_STATUS_BAR_FLOOR_DP = 64;
const androidTopInset =
  Platform.OS === 'android'
    ? Math.max(StatusBar.currentHeight ?? 0, ANDROID_STATUS_BAR_FLOOR_DP)
    : 0;

export default function App() {
  const [results, setResults] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('running');
  const [stripeReady, setStripeReady] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const resolveMount = useRef<(() => void) | null>(null);
  const statusText = formatHarnessStatus(status);

  useEffect(() => {
    registerCheckoutMount(
      (controllerId) =>
        new Promise((resolve) => {
          resolveMount.current = resolve;
          setCheckoutId(controllerId);
        })
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const scenario of scenarios) {
        let line: string;
        try {
          line = formatScenarioLine(scenario.name, {
            value: await withTimeout(scenario.run(), scenario.timeoutMs),
          });
        } catch (error) {
          line = formatScenarioLine(scenario.name, { error });
        }
        if (cancelled) {
          return;
        }
        if (scenario.name === 'initStripe') {
          setStripeReady(true);
        }
        setResults((previous) => [...previous, line]);
      }
      try {
        flush();
        setStatus('flushed');
      } catch (error) {
        console.error('[test-harness] coverage flush failed', error);
        setStatus('flush-failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishMount = () => {
    requestAnimationFrame(() => {
      const resolve = resolveMount.current;
      resolveMount.current = null;
      resolve?.();
    });
  };

  const tokens = results.map((line) =>
    formatScenarioToken(line.slice(0, line.indexOf(':')))
  );

  return (
    <SafeAreaView accessible={false} style={styles.container}>
      <Text accessible style={styles.status}>
        {statusText}
      </Text>
      {tokens.map((token) => (
        <Text key={token} accessible style={styles.result}>
          {token}
        </Text>
      ))}
      <ScrollView
        removeClippedSubviews={false}
        contentContainerStyle={styles.content}
      >
        {stripeReady ? <CardField style={styles.cardField} /> : null}
        {checkoutId ? (
          <View>
            <NativeCheckoutPaymentElement
              controllerId={checkoutId}
              style={styles.cardField}
              onHeightChanged={finishMount}
            />
          </View>
        ) : null}
        {results.map((line) => (
          <Text key={line} accessible style={styles.result}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: androidTopInset },
  content: { padding: 16 },
  status: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  cardField: { height: 50, marginBottom: 12 },
  result: { fontSize: 12, marginBottom: 4 },
});
