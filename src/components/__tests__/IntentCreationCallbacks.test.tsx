import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
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
    embeddedIntentCreationCallback: jest.fn(),
    embeddedConfirmationTokenCreationCallback: jest.fn(),
  },
}));

const native = jest.mocked(NativeStripeSdk);
const mode = { amount: 1000, currencyCode: 'USD' };
const configuration = { merchantDisplayName: 'Test' };
const originalPlatform = Platform.OS;

function intent(handler: jest.Mock, token: boolean): IntentConfiguration {
  return token
    ? { mode, confirmationTokenConfirmHandler: handler }
    : { mode, confirmHandler: handler };
}

async function register(sheet: jest.Mock, embedded: jest.Mock, token: boolean) {
  await initPaymentSheet({
    ...configuration,
    intentConfiguration: intent(sheet, token),
    returnURL: 'test://return',
  });
  const embeddedIntent = intent(embedded, token);
  renderHook(() => useEmbeddedPaymentElement(embeddedIntent, configuration));
  await act(async () => {});
}

beforeEach(() => {
  jest.resetAllMocks();
  Platform.OS = 'android';
  native.initPaymentSheet.mockResolvedValue({});
  native.createEmbeddedPaymentElement.mockResolvedValue();
  jest
    .mocked(addListener)
    .mockReturnValue({ remove: () => {} } as ReturnType<typeof addListener>);
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
    const respond = token
      ? native.confirmationTokenCreationCallback
      : native.intentCreationCallback;
    const embeddedEvent = token
      ? 'onEmbeddedConfirmationTokenHandlerCallback'
      : 'onEmbeddedConfirmHandlerCallback';
    const embeddedRespond = token
      ? native.embeddedConfirmationTokenCreationCallback
      : native.embeddedIntentCreationCallback;
    const emit = (eventName: string) => {
      jest.mocked(addListener).mock.calls.forEach(([name, handler]) => {
        if (name === eventName) {
          handler(payload);
        }
      });
    };

    it('invokes only the target handler and routes its success and error responses', async () => {
      const sheet = jest.fn();
      const embedded = jest.fn();
      await register(sheet, embedded, token);
      for (const [
        eventName,
        handler,
        other,
        responseCallback,
        otherResponseCallback,
      ] of [
        [event, sheet, embedded, respond, embeddedRespond],
        [embeddedEvent, embedded, sheet, embeddedRespond, respond],
      ] as const) {
        sheet.mockClear();
        embedded.mockClear();
        respond.mockClear();
        embeddedRespond.mockClear();
        emit(eventName);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(other).not.toHaveBeenCalled();
        const callback = handler.mock.calls[0]![token ? 1 : 2];
        callback({ clientSecret: 'test-secret' });
        expect(responseCallback).toHaveBeenLastCalledWith({
          clientSecret: 'test-secret',
        });
        callback({
          error: { message: 'Test failure', localizedMessage: 'Try again' },
        });
        expect(responseCallback).toHaveBeenLastCalledWith({
          error: { message: 'Test failure', localizedMessage: 'Try again' },
        });
        expect(otherResponseCallback).not.toHaveBeenCalled();
      }
    });

    it('preserves untagged iOS events and responses', async () => {
      Platform.OS = 'ios';
      const sheet = jest.fn();
      const embedded = jest.fn();
      await register(sheet, embedded, token);
      emit(event);
      for (const handler of [sheet, embedded]) {
        expect(handler).toHaveBeenCalledTimes(1);
        handler.mock.calls[0]![token ? 1 : 2]({ clientSecret: 'test-secret' });
        expect(respond).toHaveBeenLastCalledWith({
          clientSecret: 'test-secret',
        });
      }
    });
  }
);
