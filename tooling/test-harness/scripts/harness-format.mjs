const SCENARIO_TIMEOUT_MS = 15000;

export function describeResult(value) {
  const error = value?.error;
  if (error) {
    return `returned error ${error.code ?? 'unknown'}`;
  }
  return 'ok';
}

export function formatScenarioLine(name, outcome) {
  if (outcome.error != null) {
    return `${name}: threw ${String(outcome.error)}`;
  }
  return `${name}: ${describeResult(outcome.value)}`;
}

export function formatHarnessStatus(status) {
  return `harness: ${status}`;
}

export function withTimeout(promise, timeoutMs = SCENARIO_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
