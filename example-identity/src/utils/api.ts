import {
  AllowedTypes,
  VerificationSessionOptions,
  VerificationType,
} from '../types';

const baseURL =
  'https://stripe-mobile-identity-verification-playground.stripedemos.com';
const liveModeVerifyEndpoint = '/verification-sessions';
const testModeVerifyEndpoint = '/test/verification-sessions';

export const getTestCredentials = async (
  options: VerificationSessionOptions
) => {
  try {
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
    const json = await data.json();
    return json;
  } catch {
    return {};
  }
};
