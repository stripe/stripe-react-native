import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { CardField } from '@stripe/stripe-react-native';
import { flush } from 'react-native-coverage';
import {
  formatHarnessStatus,
  formatScenarioLine,
  withTimeout,
} from '../scripts/harness-format.mjs';
import { scenarios } from './scenarios';

type Status = 'running' | 'flushed' | 'flush-failed';

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
  content: { padding: 16 },
  status: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  cardField: { height: 50, marginBottom: 12 },
  result: { fontSize: 12, marginBottom: 4 },
});
