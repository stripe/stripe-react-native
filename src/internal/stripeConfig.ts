let currentPublishableKey: string | undefined;

export function setCurrentPublishableKey(publishableKey: string): void {
  currentPublishableKey = publishableKey;
}

export function getCurrentPublishableKey(): string | undefined {
  return currentPublishableKey;
}
