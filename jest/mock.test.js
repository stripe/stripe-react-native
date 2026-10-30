/* eslint-disable no-undef */

const stripe = require('./mock');

describe('Jest mock results', () => {
  it.each([
    ['confirmPayment', 'paymentIntent'],
    ['confirmSetupIntent', 'setupIntent'],
  ])('%s returns the expected intent', async (method, key) => {
    expect(await stripe[method]('client_secret')).toEqual({
      [key]: {},
      error: null,
    });
  });
});

describe('Jest mock hooks', () => {
  it.each([
    ['useConfirmPayment', 'confirmPayment'],
    ['useConfirmSetupIntent', 'confirmSetupIntent'],
    ['usePlatformPay', 'isPlatformPaySupported'],
    ['usePlatformPay', 'confirmPlatformPaySetupIntent'],
    ['usePlatformPay', 'confirmPlatformPayPayment'],
    ['usePlatformPay', 'dismissPlatformPay'],
    ['usePlatformPay', 'createPlatformPayPaymentMethod'],
    ['usePlatformPay', 'createPlatformPayToken'],
    ['usePlatformPay', 'updatePlatformPaySheet'],
    ['usePlatformPay', 'openPlatformPaySetup'],
    ['usePaymentSheet', 'initPaymentSheet'],
    ['usePaymentSheet', 'presentPaymentSheet'],
    ['usePaymentSheet', 'confirmPaymentSheetPayment'],
    ['useFinancialConnectionsSheet', 'collectBankAccountToken'],
    ['useFinancialConnectionsSheet', 'collectFinancialConnectionsAccounts'],
  ])('%s.%s forwards arguments and the promise', async (hook, method) => {
    const args = ['client_secret', { test: true }];
    const result = { error: { code: 'Canceled' } };
    const promise = Promise.resolve(result);
    stripe[method].mockReturnValueOnce(promise);

    const actual = stripe[hook]()[method](...args);

    expect(actual).toBe(promise);
    expect(await actual).toBe(result);
    expect(stripe[method]).toHaveBeenLastCalledWith(...args);
  });
});
