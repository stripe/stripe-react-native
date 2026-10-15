export enum VerificationType {
  DOCUMENT = 'document',
  ID_NUMBER = 'id_number',
  ADDRESS = 'address',
  PHONE = 'phone',
}

export enum AllowedTypes {
  DRIVING_LICENSE = 'driving_license',
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
}

export enum PhoneOtpCheckTypes {
  ATTEMPT = 'attempt',
  NONE = 'none',
  REQUIRED = 'required',
}

export type VerificationSessionOptions = {
  useTestMode: boolean;
  verificationType: VerificationType;
  requireMatchingSelfie: boolean;
  requireIdNumber: boolean;
  allowedTypes: Record<AllowedTypes, boolean>;
  requireLiveCapture: boolean;
  requireAddress: boolean;
  phoneFallbackToDocument: boolean;
  phoneOtpCheckType: PhoneOtpCheckTypes;
};
