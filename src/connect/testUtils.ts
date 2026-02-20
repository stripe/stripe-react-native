/**
 * Shared test utilities for Connect component tests
 */

/**
 * Mock constants returned by NativeStripeSdkModule.getConstants()
 * Used to mock the native module in tests
 */
export const mockNativeConstants = {
  API_VERSIONS: {
    CORE: '2024-12-15',
    ISSUING: '2024-12-15',
  },
  SYSTEM_INFO: {
    sdkVersion: '1.0.0',
    osVersion: '18.0',
    deviceType: 'iPhone14,5',
    appName: 'TestApp',
    appVersion: '1.0.0',
  },
};

/**
 * Creates a mock for NativeStripeSdkModule with standard test constants
 * NOTE: Prefixed with 'mock' to be allowed in jest.mock() factory functions
 * @param additionalMethods - Optional additional methods to include in the mock
 * @returns Mock module configuration
 */
export const mockCreateNativeStripeSdkMock = (
  additionalMethods: Record<string, any> = {}
) => ({
  __esModule: true,
  default: {
    getConstants: jest.fn(() => mockNativeConstants),
    ...additionalMethods,
  },
});
