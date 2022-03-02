/* eslint-disable no-undef */

const mockFunctions = {
  createPaymentMethod: jest.fn(async () => ({
    paymentMethod: {},
    error: null,
  })),
  createToken: jest.fn(async () => ({
    token: {},
    error: null,
  })),
  retrievePaymentIntent: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  retrieveSetupIntent: jest.fn(async () => ({
    setupIntent: {},
    error: null,
  })),
  confirmPayment: jest.fn(async () => ({
    paymentMethod: {},
    error: null,
  })),
  isApplePaySupported: jest.fn(async () => true),
  presentApplePay: jest.fn(async () => ({
    error: null,
  })),
  updateApplePaySummaryItems: jest.fn(async () => ({})),
  confirmApplePayPayment: jest.fn(async () => ({})),
  handleNextAction: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  confirmSetupIntent: jest.fn(async () => ({
    setupIntent: {},
    error: null,
  })),
  createTokenForCVCUpdate: jest.fn(async () => ({
    tokenId: '123',
    error: null,
  })),
  handleURLCallback: jest.fn(async () => true),
  presentPaymentSheet: jest.fn(async () => ({
    paymentOption: {},
    error: null,
  })),
  confirmPaymentSheetPayment: jest.fn(async () => ({
    error: null,
  })),
  initGooglePay: jest.fn(async () => ({
    error: null,
  })),
  presentGooglePay: jest.fn(async () => ({
    error: null,
  })),
  createGooglePayPayment: jest.fn(async () => ({
    paymentMethod: {},
    error: null,
  })),
  openApplePaySetup: jest.fn(async () => ({
    error: null,
  })),
  initPaymentSheet: jest.fn(async () => ({
    paymentOption: {},
    error: null,
  })),
};

const mockHooks = {
  useConfirmPayment: jest.fn(() => ({
    confirmPayment: jest.fn(() => ({
      ...mockFunctions.confirmPayment(),
    })),
  })),
  useConfirmSetupIntent: jest.fn(() => ({
    confirmSetupIntent: jest.fn(() => ({
      ...mockFunctions.confirmSetupIntent(),
    })),
  })),
  useGooglePay: jest.fn(() => ({
    loading: false,
    initGooglePay: jest.fn(async () => ({
      ...mockFunctions.initGooglePay(),
    })),
    presentGooglePay: jest.fn(async () => ({
      ...mockFunctions.presentGooglePay(),
    })),
    createGooglePayPaymentMethod: jest.fn(async () => ({
      ...mockFunctions.createGooglePayPayment(),
    })),
  })),
  useApplePay: jest.fn(() => ({
    loading: false,
    isApplePaySupported: true,
    presentApplePay: jest.fn(async () => ({
      ...mockFunctions.presentApplePay(),
    })),
    confirmApplePayPayment: jest.fn(async () => ({
      ...mockFunctions.confirmApplePayPayment(),
    })),
    openApplePaySetup: jest.fn(async () => ({
      ...mockFunctions.openApplePaySetup(),
    })),
  })),
  usePaymentSheet: jest.fn(() => ({
    loading: false,
    initPaymentSheet: jest.fn(async () => ({
      ...mockFunctions.initPaymentSheet(),
    })),
    presentPaymentSheet: jest.fn(async () => ({
      ...mockFunctions.presentPaymentSheet(),
    })),
    confirmPaymentSheetPayment: jest.fn(async () => ({
      ...mockFunctions.confirmPaymentSheetPayment(),
    })),
  })),
};

module.exports = {
  ...mockFunctions,
  ...mockHooks,
  StripeProvider: () => 'StripeProvider',
  CardField: () => 'CardField',
  ApplePayButton: () => 'ApplePayButton',
  AuBECSDebitForm: () => 'AuBECSDebitForm',
  GooglePayButton: () => 'GooglePayButton',
  useStripe: jest.fn(() => mockHooks),
};
