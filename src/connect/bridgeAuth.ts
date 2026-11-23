export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

// Returns the inner message and its document id, or null unless the envelope
// carries the token and a document id.
export function unwrapBridgeMessage(
  data: unknown,
  token: string
): { message: string; documentId: string } | null {
  if (typeof data !== 'string') return null;
  try {
    const envelope: unknown = JSON.parse(data);
    if (!isRecord(envelope)) return null;
    const { token: received, message, documentId } = envelope;
    if (typeof received !== 'string' || received !== token) return null;
    if (
      typeof documentId !== 'string' ||
      documentId.length === 0 ||
      documentId.length > 64
    ) {
      return null;
    }
    return typeof message === 'string' ? { message, documentId } : null;
  } catch {
    return null;
  }
}
