import { act, renderHook } from '@testing-library/react-native';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import { presentIdentityVerificationSheet } from '../functions';
import { useStripeIdentity } from '../../hooks/useStripeIdentity';
import type {
  IdentityVerificationSheetOptions,
  IdentityVerificationSheetResult,
} from '../../types/Identity';

jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: { presentIdentityVerificationSheet: jest.fn() },
}));

const presentNative = jest.mocked(
  NativeStripeSdk.presentIdentityVerificationSheet
);
const options: IdentityVerificationSheetOptions = {
  sessionId: 'vs_example',
  ephemeralKeySecret: 'ek_example',
  brandLogo: { uri: 'brand_logo', width: 64, height: 64, scale: 1 },
};
const failed: IdentityVerificationSheetResult = {
  status: 'FlowFailed',
  error: { code: 'FlowFailed', message: 'Unable to verify identity.' },
};

beforeEach(() => {
  presentNative.mockReset();
});

describe('presentIdentityVerificationSheet', () => {
  it.each<IdentityVerificationSheetResult>([
    { status: 'FlowCompleted' },
    { status: 'FlowCanceled' },
    failed,
  ])('returns the native $status result', async (nativeResult) => {
    presentNative.mockResolvedValue(nativeResult);

    await expect(presentIdentityVerificationSheet(options)).resolves.toEqual(
      nativeResult
    );
    expect(presentNative).toHaveBeenCalledWith(options);
    expect(presentNative).toHaveBeenCalledTimes(1);
  });

  it('turns a rejected bridge promise into a failure result', async () => {
    presentNative.mockRejectedValue(new Error('Activity unavailable'));

    await expect(presentIdentityVerificationSheet(options)).resolves.toEqual({
      status: 'FlowFailed',
      error: { code: 'FlowFailed', message: 'Activity unavailable' },
    });
  });
});

describe('useStripeIdentity', () => {
  it('stays loading through credential fetching and sheet presentation', async () => {
    let provideOptions!: (value: IdentityVerificationSheetOptions) => void;
    let complete!: (value: IdentityVerificationSheetResult) => void;
    const provider = jest.fn(
      () =>
        new Promise<IdentityVerificationSheetOptions>((resolve) => {
          provideOptions = resolve;
        })
    );
    presentNative.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const { result } = renderHook(() => useStripeIdentity(provider));
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBeUndefined();

    let presentation!: Promise<void>;
    act(() => {
      presentation = result.current.present();
    });
    expect(result.current.loading).toBe(true);
    expect(presentNative).not.toHaveBeenCalled();

    await act(async () => {
      provideOptions(options);
    });
    expect(result.current.loading).toBe(true);
    expect(presentNative).toHaveBeenCalledWith(options);

    await act(async () => {
      complete({ status: 'FlowCompleted' });
      await presentation;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe('FlowCompleted');
    expect(result.current.error).toBeUndefined();
  });

  it('reports credential failures and permits retry with fresh credentials', async () => {
    const provider = jest
      .fn()
      .mockRejectedValueOnce(new Error('Server unavailable'))
      .mockResolvedValueOnce(options);
    presentNative.mockResolvedValue({ status: 'FlowCanceled' });
    const { result } = renderHook(() => useStripeIdentity(provider));

    await act(async () => {
      await result.current.present();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe('FlowFailed');
    expect(result.current.error?.message).toBe('Server unavailable');
    expect(presentNative).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.present();
    });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('FlowCanceled');
    expect(result.current.error).toBeUndefined();
  });

  it('prevents duplicate presentations while a request is in flight', async () => {
    let complete!: (value: IdentityVerificationSheetResult) => void;
    const provider = jest.fn(async () => options);
    presentNative.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const { result } = renderHook(() => useStripeIdentity(provider));
    let presentation!: Promise<void>;

    await act(async () => {
      presentation = result.current.present();
      await result.current.present();
    });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(presentNative).toHaveBeenCalledTimes(1);

    await act(async () => {
      complete(failed);
      await presentation;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(failed.error);
  });
});
