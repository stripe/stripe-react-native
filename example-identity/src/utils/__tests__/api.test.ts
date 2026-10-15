import {
  AllowedTypes,
  PhoneOtpCheckTypes,
  VerificationSessionOptions,
  VerificationType,
} from '../../types';
import { getTestCredentials } from '../api';

const baseOptions: VerificationSessionOptions = {
  useTestMode: false,
  verificationType: VerificationType.DOCUMENT,
  requireMatchingSelfie: false,
  requireIdNumber: false,
  allowedTypes: {
    [AllowedTypes.DRIVING_LICENSE]: true,
    [AllowedTypes.ID_CARD]: true,
    [AllowedTypes.PASSPORT]: true,
  },
  requireLiveCapture: false,
  requireAddress: false,
  phoneFallbackToDocument: false,
  phoneOtpCheckType: PhoneOtpCheckTypes.ATTEMPT,
};

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

describe('getTestCredentials', () => {
  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 'vs_123',
        ephemeral_key_secret: 'ek_123',
      }),
    });
  });

  it('returns validated session credentials', async () => {
    await expect(getTestCredentials(baseOptions)).resolves.toEqual({
      id: 'vs_123',
      ephemeral_key_secret: 'ek_123',
    });
  });

  it('preserves network failures', async () => {
    const error = new Error('Network request failed');
    fetchMock.mockRejectedValueOnce(error);

    await expect(getTestCredentials(baseOptions)).rejects.toBe(error);
  });

  it('preserves invalid JSON failures', async () => {
    const error = new SyntaxError('Invalid JSON response');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(error),
    });

    await expect(getTestCredentials(baseOptions)).rejects.toBe(error);
  });

  it('reports an unavailable backend instead of returning credentials', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(getTestCredentials(baseOptions)).rejects.toThrow(
      'Unable to create an Identity session (HTTP 503).'
    );
  });

  it.each([
    { error: 'This verification type is unavailable.' },
    { error: { message: 'This verification type is unavailable.' } },
  ])('preserves backend error messages', async (body) => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue(body),
    });

    await expect(getTestCredentials(baseOptions)).rejects.toThrow(
      'This verification type is unavailable.'
    );
  });

  it.each([
    null,
    [],
    'invalid',
    {},
    { id: 'vs_123' },
    { ephemeral_key_secret: 'ek_123' },
    { id: 123, ephemeral_key_secret: 'ek_123' },
    { id: 'vs_123', ephemeral_key_secret: null },
    { id: ' ', ephemeral_key_secret: 'ek_123' },
    { id: 'vs_123', ephemeral_key_secret: '' },
  ])('rejects malformed or incomplete credentials: %p', async (body) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(body),
    });

    await expect(getTestCredentials(baseOptions)).rejects.toThrow(
      'The Identity server returned incomplete session credentials.'
    );
  });

  it('creates a live-mode Verification Session by default', async () => {
    await getTestCredentials(baseOptions);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://stripe-mobile-identity-verification-playground.stripedemos.com/verification-sessions',
      expect.any(Object)
    );
  });

  it('creates a test-mode Verification Session when enabled', async () => {
    await getTestCredentials({ ...baseOptions, useTestMode: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://stripe-mobile-identity-verification-playground.stripedemos.com/test/verification-sessions',
      expect.any(Object)
    );
  });

  it('sends the selected document types and requirements', async () => {
    await getTestCredentials({
      ...baseOptions,
      requireMatchingSelfie: true,
      requireIdNumber: true,
      requireLiveCapture: true,
      requireAddress: true,
      allowedTypes: {
        ...baseOptions.allowedTypes,
        [AllowedTypes.ID_CARD]: false,
      },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      type: 'document',
      options: {
        document: {
          require_matching_selfie: true,
          require_id_number: true,
          require_live_capture: true,
          require_address: true,
          allowed_types: ['driving_license', 'passport'],
        },
      },
    });
  });

  it('sends phone OTP and document options when fallback is enabled', async () => {
    await getTestCredentials({
      ...baseOptions,
      verificationType: VerificationType.PHONE,
      phoneFallbackToDocument: true,
      phoneOtpCheckType: PhoneOtpCheckTypes.REQUIRED,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      type: 'phone',
      options: {
        phone_records: { fallback: 'document' },
        phone_otp: { check: 'required' },
        document: {
          require_matching_selfie: false,
          require_id_number: false,
          require_live_capture: false,
          require_address: false,
          allowed_types: ['driving_license', 'id_card', 'passport'],
        },
      },
    });
  });

  it.each([
    VerificationType.PHONE,
    VerificationType.ID_NUMBER,
    VerificationType.ADDRESS,
  ])(
    'omits document options for a %s session without fallback',
    async (type) => {
      await getTestCredentials({ ...baseOptions, verificationType: type });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type });
    }
  );
});
