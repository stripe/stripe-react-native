import { createBridgeToken, unwrapBridgeMessage } from '../bridgeAuth';

describe('createBridgeToken', () => {
  const originalCrypto = (globalThis as any).crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  const withCrypto = (value: unknown) =>
    Object.defineProperty(globalThis, 'crypto', {
      value,
      configurable: true,
      writable: true,
    });

  it('uses WebCrypto when it is available', () => {
    const getRandomValues = jest.fn((bytes: Uint8Array) => bytes.fill(0xab));
    withCrypto({ getRandomValues });

    expect(createBridgeToken()).toBe('ab'.repeat(16));
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('falls back when WebCrypto is missing', () => {
    withCrypto(undefined);

    const first = createBridgeToken();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(createBridgeToken()).not.toBe(first);
  });
});

describe('unwrapBridgeMessage', () => {
  const token = 'a'.repeat(32);

  it('returns the inner message when the token matches', () => {
    expect(
      unwrapBridgeMessage(
        JSON.stringify({ token, documentId: 'd1', message: '{"type":"x"}' }),
        token
      )
    ).toEqual({ message: '{"type":"x"}', documentId: 'd1' });
  });

  it('rejects an envelope without a document id', () => {
    const unwrap = (documentId: unknown) =>
      unwrapBridgeMessage(
        JSON.stringify({ token, documentId, message: '{"type":"x"}' }),
        token
      );

    expect(unwrap(undefined)).toBeNull();
    expect(unwrap(5)).toBeNull();
    expect(unwrap('')).toBeNull();
    expect(unwrap('d'.repeat(65))).toBeNull();
  });
});
