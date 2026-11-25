import { mockCreateNativeStripeSdkMock } from '../testUtils';

jest.mock('../../specs/NativeStripeSdkModule', () =>
  mockCreateNativeStripeSdkMock()
);

jest.mock('../../specs/NativeOnrampSdkModule', () => ({
  __esModule: true,
  default: { addListener: jest.fn(), removeListeners: jest.fn() },
}));

describe('ConnectNotificationBanner', () => {
  it('is not exported from the package entry point while in preview', () => {
    const packageExports = jest.requireActual('../../index');

    expect(typeof packageExports.ConnectPayouts).toBe('function');
    expect(packageExports).not.toHaveProperty('ConnectNotificationBanner');
  });
});
