export declare function describeResult(value: unknown): string;

export declare function formatScenarioLine(
  name: string,
  outcome: { value?: unknown; error?: unknown }
): string;

export declare function formatHarnessStatus(status: string): string;

export declare function formatScenarioToken(name: string): string;

export declare function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number
): Promise<T>;
