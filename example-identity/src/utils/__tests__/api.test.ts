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
      json: jest.fn().mockResolvedValue({
        id: 'vs_123',
        ephemeral_key_secret: 'ek_123',
      }),
    });
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
