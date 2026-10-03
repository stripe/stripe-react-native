import { addListener } from '../../events';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';
import { runServerUpdate } from '../runServerUpdate';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    runCheckoutServerUpdate: jest.fn(),
    completeCheckoutServerUpdate: jest.fn(),
  },
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const start = NativeStripeSdk.runCheckoutServerUpdate as jest.Mock;
const complete = NativeStripeSdk.completeCheckoutServerUpdate as jest.Mock;
const listen = addListener as jest.Mock;
const controllerId = 'controller';

beforeEach(() => {
  start.mockReset();
  complete.mockReset().mockResolvedValue(undefined);
  listen.mockReset().mockImplementation(() => ({ remove: jest.fn() }));
});

function request(
  controller = controllerId,
  operation = start.mock.calls[0][1]
) {
  listen.mock.calls[0][1]({
    controllerId: controller,
    operationId: operation,
  });
}

it.each([undefined, new Error('Server failed')])(
  'reports callback completion to its native operation: %s',
  async (error) => {
    const pending = deferred();
    start.mockReturnValue(pending.promise);
    const callback = jest.fn(async () => {
      if (error) {
        throw error;
      }
    });
    const update = runServerUpdate(controllerId, callback);
    expect(callback).not.toHaveBeenCalled();
    complete.mockImplementation(async () => {
      pending.resolve();
    });
    request('other');
    request(controllerId, 'other');
    request();
    await update;
    expect(callback).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      ...start.mock.calls[0],
      error?.message ?? null
    );
    expect(listen.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
  }
);

it('cleans up after native failure and ignores a late callback', async () => {
  const native = deferred();
  const callback = deferred();
  start.mockReturnValue(native.promise);
  const update = runServerUpdate(controllerId, () => callback.promise);
  request();
  native.reject(new Error('Native update failed'));
  await expect(update).rejects.toThrow('Native update failed');
  callback.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(complete).not.toHaveBeenCalled();
  expect(listen.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
});

it('rejects if native cannot receive the callback result', async () => {
  start.mockReturnValue(new Promise(() => {}));
  complete.mockRejectedValue(new Error('Bridge unavailable'));
  const update = runServerUpdate(controllerId, async () => {});
  request();
  await expect(update).rejects.toThrow('Bridge unavailable');
  expect(listen.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
});
