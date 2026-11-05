import { act, renderHook } from '@testing-library/react-native';
import { Platform, EventSubscription } from 'react-native';
import { initPaymentSheet } from '../../functions';
import { useEmbeddedPaymentElement } from '../../types/EmbeddedPaymentElement';
import type { IntentConfiguration } from '../../types/PaymentSheet';
import { addListener } from '../../events';
import NativeStripeSdk from '../../specs/NativeStripeSdkModule';

jest.mock('../../events', () => ({ addListener: jest.fn() }));
jest.mock('../../specs/NativeEmbeddedPaymentElement', () => ({
  __esModule: true,
  default: 'EmbeddedPaymentElement',
  Commands: {},
}));
jest.mock('../../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    getConstants: jest.fn(() => ({})),
    initPaymentSheet: jest.fn(),
    createEmbeddedPaymentElement: jest.fn(),
    intentCreationCallback: jest.fn(),
    confirmationTokenCreationCallback: jest.fn(),
  },
}));

type Handler = (event: any) => void;
const listeners = new Map<string, Set<Handler>>();
const native = jest.mocked(NativeStripeSdk);
const mode = { amount: 1000, currencyCode: 'USD' };
const configuration = { merchantDisplayName: 'Test' };
const originalPlatform = Platform.OS;

function emit(name: string, payload: object) {
  listeners.get(name)?.forEach((handler) => handler(payload));
}

function intent(handler: jest.Mock, token: boolean): IntentConfiguration {
  return token
    ? { mode, confirmationTokenConfirmHandler: handler }
    : { mode, confirmHandler: handler };
}

async function register(
  sheet: IntentConfiguration,
  embedded: IntentConfiguration
) {
  await initPaymentSheet({
    ...configuration,
    intentConfiguration: sheet,
    returnURL: 'test://return',
  });
  const hook = renderHook(() =>
    useEmbeddedPaymentElement(embedded, configuration)
  );
  await act(async () => {});
  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
  listeners.clear();
  Platform.OS = 'android';
  native.initPaymentSheet.mockResolvedValue({});
  native.createEmbeddedPaymentElement.mockResolvedValue();
  jest.mocked(addListener).mockImplementation((name, handler) => {
    const handlers = listeners.get(name) ?? new Set<Handler>();
    const callback = handler as Handler;
    handlers.add(callback);
    listeners.set(name, handlers);
    return {
      remove: () => {
        handlers.delete(callback);
      },
    } as EventSubscription;
  });
});

afterEach(() => {
  Platform.OS = originalPlatform;
});

describe.each([false, true])(
  'deferred callbacks (ConfirmationToken: %s)',
  (token) => {
    const event = token
      ? 'onConfirmationTokenHandlerCallback'
      : 'onConfirmHandlerCallback';
    const payload = token
      ? { confirmationToken: { id: 'test-token' } }
      : { paymentMethod: { id: 'test-method' }, shouldSavePaymentMethod: true };
    const respond = () =>
      token
        ? native.confirmationTokenCreationCallback
        : native.intentCreationCallback;

    it('invokes only the target handler and binds success and error responses to the original request', async () => {
      const sheet = jest.fn();
      const embedded = jest.fn();
      await register(intent(sheet, token), intent(embedded, token));
      for (const [component, handler, other] of [
        ['paymentSheet', sheet, embedded],
        ['embeddedPaymentElement', embedded, sheet],
      ] as const) {
        sheet.mockClear();
        embedded.mockClear();
        const requestId = `request-${component}`;
        emit(event, { ...payload, component, requestId });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(other).not.toHaveBeenCalled();
        const callback = handler.mock.calls[0]![token ? 1 : 2];
        callback({
          clientSecret: 'test-secret',
          component: 'wrong',
          requestId: 'wrong',
        });
        expect(respond()).toHaveBeenLastCalledWith({
          clientSecret: 'test-secret',
          component,
          requestId,
        });
        callback({
          error: { message: 'Test failure', localizedMessage: 'Try again' },
        });
        expect(respond()).toHaveBeenLastCalledWith({
          error: { message: 'Test failure', localizedMessage: 'Try again' },
          component,
          requestId,
        });
      }
    });

    it('ignores untagged, malformed, and unknown Android routing before invoking handlers', async () => {
      const sheet = jest.fn();
      const embedded = jest.fn();
      await register(intent(sheet, token), intent(embedded, token));
      for (const routing of [
        {},
        { component: 'unknown', requestId: 'request' },
        { component: 'paymentSheet' },
        { component: 'embeddedPaymentElement', requestId: '' },
        { component: 'paymentSheet', requestId: 123 },
      ]) {
        emit(event, { ...payload, ...routing });
      }
      expect(sheet).not.toHaveBeenCalled();
      expect(embedded).not.toHaveBeenCalled();
    });

    it('preserves untagged iOS events and responses', async () => {
      Platform.OS = 'ios';
      const sheet = jest.fn();
      const embedded = jest.fn();
      await register(intent(sheet, token), intent(embedded, token));
      emit(event, payload);
      for (const handler of [sheet, embedded]) {
        expect(handler).toHaveBeenCalledTimes(1);
        handler.mock.calls[0]![token ? 1 : 2]({ clientSecret: 'test-secret' });
        expect(respond()).toHaveBeenLastCalledWith({
          clientSecret: 'test-secret',
        });
      }
    });

    it('removes obsolete subscriptions when replacing handler kinds or removing handlers', async () => {
      const oldSheet = jest.fn();
      const oldEmbedded = jest.fn();
      const hook = await register(
        intent(oldSheet, token),
        intent(oldEmbedded, token)
      );
      hook.unmount();
      const sheet = jest.fn();
      const embedded = jest.fn();
      const replacement = await register(
        intent(sheet, !token),
        intent(embedded, !token)
      );
      emit(event, {
        ...payload,
        component: 'paymentSheet',
        requestId: 'old-sheet',
      });
      emit(event, {
        ...payload,
        component: 'embeddedPaymentElement',
        requestId: 'old-embedded',
      });
      expect(oldSheet).not.toHaveBeenCalled();
      expect(oldEmbedded).not.toHaveBeenCalled();
      expect(listeners.get(event)?.size).toBe(0);
      replacement.unmount();
      await register({ mode }, { mode });
      expect(listeners.get('onConfirmHandlerCallback')?.size).toBe(0);
      expect(listeners.get('onConfirmationTokenHandlerCallback')?.size).toBe(0);
    });
  }
);
