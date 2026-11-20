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

  it('returns 32 hex characters', () => {
    expect(createBridgeToken()).toMatch(/^[0-9a-f]{32}$/);
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

  it('falls back when getRandomValues throws', () => {
    withCrypto({
      getRandomValues: () => {
        throw new Error('unavailable');
      },
    });

    expect(createBridgeToken()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('unwrapBridgeMessage', () => {
  const token = 'a'.repeat(32);
  const envelope = (value: unknown) => JSON.stringify(value);

  it('returns the inner message when the token matches', () => {
    expect(
      unwrapBridgeMessage(envelope({ token, message: '{"type":"x"}' }), token)
    ).toBe('{"type":"x"}');
  });

  it.each([
    ['a raw message', '{"type":"fetchClientSecret"}'],
    ['not JSON', 'nope'],
    ['null', 'null'],
    ['a number', '1'],
    ['a string', '"x"'],
    ['an array', '[]'],
    ['a missing token', envelope({ message: 'm' })],
    ['a wrong token', envelope({ token: 'b'.repeat(32), message: 'm' })],
    ['a non-string token', envelope({ token: 1, message: 'm' })],
    ['a missing message', envelope({ token })],
    ['a non-string message', envelope({ token, message: { type: 'x' } })],
  ])('rejects %s', (_desc, data) => {
    expect(unwrapBridgeMessage(data, token)).toBeNull();
  });

  it.each([undefined, null, 5, {}, ['x']])(
    'rejects non-string data %p',
    (data) => {
      expect(unwrapBridgeMessage(data, token)).toBeNull();
    }
  );
});
