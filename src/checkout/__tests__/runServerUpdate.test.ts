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

function request(index = 0) {
  const [id, operationId] = start.mock.calls[index];
  listen.mock.calls[index][1]({ controllerId: id, operationId });
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
    request();
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

it('does not cross controller or operation responses', async () => {
  const first = deferred();
  const second = deferred();
  start.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const callback = jest.fn(async () => {});
  const otherCallback = jest.fn(async () => {});
  const update = runServerUpdate(controllerId, callback);
  const other = runServerUpdate('other', otherCallback);
  expect(start.mock.calls[0][1]).not.toBe(start.mock.calls[1][1]);
  const listener = listen.mock.calls[0][1];
  listener({ controllerId: 'other', operationId: start.mock.calls[0][1] });
  listener({ controllerId, operationId: start.mock.calls[1][1] });
  request(1);
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
  expect(otherCallback).toHaveBeenCalledTimes(1);
  first.resolve();
  second.resolve();
  await Promise.all([update, other]);
});

it.each(['timeout', 'destroyed', 'native failure'])(
  'cleans up after %s and ignores a late callback',
  async (message) => {
    const native = deferred();
    const callback = deferred();
    start.mockReturnValue(native.promise);
    const update = runServerUpdate(controllerId, () => callback.promise);
    request();
    native.reject(new Error(message));
    await expect(update).rejects.toThrow(message);
    callback.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(complete).not.toHaveBeenCalled();
    expect(listen.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
  }
);

it('rejects if sending the callback completion fails', async () => {
  const native = deferred();
  start.mockReturnValue(native.promise);
  complete.mockRejectedValue(new Error('Bridge unavailable'));
  const update = runServerUpdate(controllerId, async () => {});
  request();
  await expect(update).rejects.toThrow('Bridge unavailable');
  expect(listen.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
  native.resolve();
});

it('ignores a request delivered after native has already failed', async () => {
  start.mockRejectedValue(new Error('Controller destroyed'));
  const callback = jest.fn(async () => {});
  await expect(runServerUpdate(controllerId, callback)).rejects.toThrow(
    'Controller destroyed'
  );
  request();
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
});
