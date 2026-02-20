/* eslint-disable no-undef */
/**
 * Jest setup file to mock native modules
 */

// Mock OnrampSdk TurboModule
jest.mock('../src/specs/NativeOnrampSdkModule', () => ({
  __esModule: true,
  default: {
    initialise: jest.fn(),
    configureOnramp: jest.fn(),
    hasLinkAccount: jest.fn(),
    registerLinkUser: jest.fn(),
    registerWalletAddress: jest.fn(),
    attachKycInfo: jest.fn(),
    presentKycInfoVerification: jest.fn(),
    updatePhoneNumber: jest.fn(),
    authenticateUser: jest.fn(),
    authenticateUserWithToken: jest.fn(),
    verifyIdentity: jest.fn(),
    collectPaymentMethod: jest.fn(),
    provideCheckoutClientSecret: jest.fn(),
    onCheckoutClientSecretRequested: null,
    createCryptoPaymentToken: jest.fn(),
    performCheckout: jest.fn(),
    onrampAuthorize: jest.fn(),
    getCryptoTokenDisplayData: jest.fn(),
    logout: jest.fn(),
  },
}));
