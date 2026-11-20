export function createBridgeToken(): string {
  const bytes = new Uint8Array(16);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    // Hermes has no WebCrypto; RN's PRNG isn't observable from the WebView.
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns the inner message, or null unless the envelope carries the token.
export function unwrapBridgeMessage(
  data: unknown,
  token: string
): string | null {
  if (typeof data !== 'string') return null;
  try {
    const envelope: unknown = JSON.parse(data);
    if (
      typeof envelope !== 'object' ||
      envelope === null ||
      Array.isArray(envelope)
    ) {
      return null;
    }
    const { token: received, message } = envelope as Record<string, unknown>;
    if (typeof received !== 'string' || received !== token) return null;
    return typeof message === 'string' ? message : null;
  } catch {
    return null;
  }
}
