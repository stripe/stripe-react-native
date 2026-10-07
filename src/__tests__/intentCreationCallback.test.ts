import { act, renderHook } from '@testing-library/react-native';
import { addListener } from '../events';
import { initPaymentSheet } from '../functions';
import NativeStripeSdk from '../specs/NativeStripeSdkModule';
import { useEmbeddedPaymentElement } from '../types/EmbeddedPaymentElement';
import type {
  IntentConfiguration,
  IntentCreationCallbackParams,
} from '../types/PaymentSheet';

jest.mock('../events', () => ({ addListener: jest.fn() }));
jest.mock('../specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: {
    getConstants: jest.fn(() => ({})),
    initPaymentSheet: jest.fn(),
    createEmbeddedPaymentElement: jest.fn(),
    intentCreationCallback: jest.fn(),
    confirmationTokenCreationCallback: jest.fn(),
  },
}));
jest.mock('../specs/NativeEmbeddedPaymentElement', () => ({
  __esModule: true,
  default: 'EmbeddedPaymentElementView',
  Commands: {},
}));

const events = addListener as jest.Mock;
const paymentMethod = { id: 'pm_test' };
const confirmationToken = { id: 'ctoken_test' };
const handlerCases = [
  {
    handlerName: 'confirmHandler',
    event: 'onConfirmHandlerCallback',
    eventData: { paymentMethod, shouldSavePaymentMethod: true },
    merchantArguments: [paymentMethod, true],
    complete: NativeStripeSdk.intentCreationCallback as jest.Mock,
  },
  {
    handlerName: 'confirmationTokenConfirmHandler',
    event: 'onConfirmationTokenHandlerCallback',
    eventData: { confirmationToken },
    merchantArguments: [confirmationToken],
    complete: NativeStripeSdk.confirmationTokenCreationCallback as jest.Mock,
  },
] as const;

beforeEach(() => {
  events.mockReset().mockImplementation(() => ({ remove: jest.fn() }));
  (NativeStripeSdk.initPaymentSheet as jest.Mock)
    .mockReset()
    .mockResolvedValue({});
  (NativeStripeSdk.createEmbeddedPaymentElement as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  handlerCases.forEach(({ complete }) =>
    complete.mockReset().mockResolvedValue(undefined)
  );
});

describe.each(['PaymentSheet', 'EmbeddedPaymentElement'])(
  '%s confirmation requests',
  (consumer) => {
    async function initialize(intentConfiguration: IntentConfiguration) {
      const configuration = {
        merchantDisplayName: 'Example',
        returnURL: 'example://stripe-redirect',
      };
      if (consumer === 'PaymentSheet') {
        await initPaymentSheet({ ...configuration, intentConfiguration });
      } else {
        renderHook(() =>
          useEmbeddedPaymentElement(intentConfiguration, configuration)
        );
        await act(async () => {
          await Promise.resolve();
        });
      }
    }

    describe.each(handlerCases)('$handlerName', (handlerCase) => {
      async function setup() {
        const merchantHandler = jest.fn();
        await initialize({
          mode: { amount: 1099, currencyCode: 'USD' },
          [handlerCase.handlerName]: merchantHandler,
        });
        const listener = events.mock.calls.find(
          ([name]) => name === handlerCase.event
        )![1];
        return { merchantHandler, listener };
      }

      it('returns delayed results to their original requests out of order', async () => {
        const { merchantHandler, listener } = await setup();
        listener({ ...handlerCase.eventData, requestId: 'first' });
        listener({ ...handlerCase.eventData, requestId: 'second' });

        expect(merchantHandler).toHaveBeenNthCalledWith(
          1,
          ...handlerCase.merchantArguments,
          expect.any(Function)
        );
        expect(merchantHandler).toHaveBeenNthCalledWith(
          2,
          ...handlerCase.merchantArguments,
          expect.any(Function)
        );
        expect(handlerCase.complete).not.toHaveBeenCalled();

        const callbackIndex = handlerCase.merchantArguments.length;
        const firstCallback = merchantHandler.mock.calls[0][callbackIndex];
        const secondCallback = merchantHandler.mock.calls[1][callbackIndex];
        const success = Object.freeze({ clientSecret: 'pi_second_secret' });
        const failure: IntentCreationCallbackParams = Object.freeze({
          error: Object.freeze({
            code: 'Failed',
            message: 'Server failed',
            localizedMessage: 'Please try again',
          }),
        });

        await secondCallback(success);
        await firstCallback(failure);

        expect(handlerCase.complete.mock.calls).toEqual([
          [{ ...success, requestId: 'second' }],
          [{ ...failure, requestId: 'first' }],
        ]);
        expect(success).not.toHaveProperty('requestId');
        expect(failure).not.toHaveProperty('requestId');
        expect(handlerCase.complete.mock.calls[0][0]).not.toBe(success);
        expect(handlerCase.complete.mock.calls[1][0]).not.toBe(failure);
      });

      it.each<IntentCreationCallbackParams>([
        { clientSecret: 'pi_untagged_secret' },
        { error: { code: 'Failed', message: 'Server failed' } },
      ])('preserves untagged results: %j', async (result) => {
        const { merchantHandler, listener } = await setup();
        listener(handlerCase.eventData);
        const callback =
          merchantHandler.mock.calls[0][handlerCase.merchantArguments.length];

        await callback(result);

        expect(handlerCase.complete).toHaveBeenCalledTimes(1);
        expect(handlerCase.complete.mock.calls[0][0]).toBe(result);
        expect(handlerCase.complete.mock.calls[0][0]).not.toHaveProperty(
          'requestId'
        );
      });
    });
  }
);
