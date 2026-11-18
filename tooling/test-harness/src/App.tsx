import { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { CardField } from '@stripe/stripe-react-native';
import { flush } from 'react-native-coverage';
import {
  formatHarnessStatus,
  formatScenarioLine,
  withTimeout,
} from '../scripts/harness-format.mjs';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const scenario of scenarios) {
        let line: string;
        try {
          line = formatScenarioLine(
            scenario.name,
            { value: await withTimeout(scenario.run()) }
          );
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.status}>{formatHarnessStatus(status)}</Text>
        {stripeReady ? <CardField style={styles.cardField} /> : null}
        {results.map((line) => (
          <Text key={line} style={styles.result}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 16 + androidTopInset },
  status: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  cardField: { height: 50, marginBottom: 12 },
  result: { fontSize: 12, marginBottom: 4 },
});
