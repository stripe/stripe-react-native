import {
  AllowedTypes,
  VerificationSessionOptions,
  VerificationType,
} from '../types';

const baseURL =
  'https://stripe-mobile-identity-verification-playground.stripedemos.com';
const liveModeVerifyEndpoint = '/verification-sessions';
const testModeVerifyEndpoint = '/test/verification-sessions';

type VerificationSessionCredentials = {
  id: string;
  ephemeral_key_secret: string;
};

export const getTestCredentials = async (
  options: VerificationSessionOptions
): Promise<VerificationSessionCredentials> => {
  const verifyEndpoint = options.useTestMode
    ? testModeVerifyEndpoint
    : liveModeVerifyEndpoint;
  let data;
  if (options.verificationType === VerificationType.DOCUMENT) {
    data = await fetch(baseURL + verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: options.verificationType,
        options: {
          document: {
            require_matching_selfie: options.requireMatchingSelfie,
            require_id_number: options.requireIdNumber,
            require_live_capture: options.requireLiveCapture,
            require_address: options.requireAddress,
            allowed_types: (
              Object.keys(options.allowedTypes) as AllowedTypes[]
            ).filter((key: AllowedTypes) => options.allowedTypes[key]),
          },
        },
      }),
    });
  } else if (options.verificationType === VerificationType.PHONE) {
    let body = options.phoneFallbackToDocument
      ? JSON.stringify({
          type: options.verificationType,
          options: {
            phone_records: { fallback: 'document' },
            phone_otp: { check: options.phoneOtpCheckType },
            document: {
              require_matching_selfie: options.requireMatchingSelfie,
              require_id_number: options.requireIdNumber,
              require_live_capture: options.requireLiveCapture,
              require_address: options.requireAddress,
              allowed_types: (
                Object.keys(options.allowedTypes) as AllowedTypes[]
              ).filter((key: AllowedTypes) => options.allowedTypes[key]),
            },
          },
        })
      : JSON.stringify({
          type: options.verificationType,
        });
    data = await fetch(baseURL + verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });
  } else {
    data = await fetch(baseURL + verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: options.verificationType,
      }),
    });
  }
  const json: unknown = await data.json();
  if (!data.ok) {
    const error =
      typeof json === 'object' && json !== null && 'error' in json
        ? json.error
        : undefined;
    const message =
      typeof error === 'string'
        ? error
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : undefined;
    throw new Error(
      message || `Unable to create an Identity session (HTTP ${data.status}).`
    );
  }
  if (
    typeof json !== 'object' ||
    json === null ||
    !('id' in json) ||
    typeof json.id !== 'string' ||
    !json.id.trim() ||
    !('ephemeral_key_secret' in json) ||
    typeof json.ephemeral_key_secret !== 'string' ||
    !json.ephemeral_key_secret.trim()
  ) {
    throw new Error(
      'The Identity server returned incomplete session credentials.'
    );
  }
  return { id: json.id, ephemeral_key_secret: json.ephemeral_key_secret };
};
