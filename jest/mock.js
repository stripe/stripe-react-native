/* eslint-disable no-undef */

const mockFunctions = {
  initStripe: jest.fn(async () => ({})),
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
  isPlatformPaySupported: jest.fn(async () => true),
  confirmPlatformPaySetupIntent: jest.fn(async () => ({
    setupIntent: {},
    error: null,
  })),
  confirmPlatformPayPayment: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  dismissPlatformPay: jest.fn(async () => true),
  createPlatformPayPaymentMethod: jest.fn(async () => ({
    paymentMethod: {},
    error: null,
  })),
  createPlatformPayToken: jest.fn(async () => ({
    token: {},
    error: null,
  })),
  updatePlatformPaySheet: jest.fn(async () => ({
    error: null,
  })),
  openPlatformPaySetup: jest.fn(async () => {
    return;
  }),
  handleNextAction: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  handleNextActionForSetup: jest.fn(async () => ({
    setupIntent: {},
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
  verifyMicrodepositsForPayment: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  verifyMicrodepositsForSetup: jest.fn(async () => ({
    setupIntent: {},
    error: null,
  })),
  initPaymentSheet: jest.fn(async () => ({
    paymentOption: {},
    error: null,
  })),
  presentPaymentSheet: jest.fn(async () => ({
    paymentOption: {},
    error: null,
  })),
  confirmPaymentSheetPayment: jest.fn(async () => ({
    error: null,
  })),
  resetPaymentSheetCustomer: jest.fn(async () => null),
  openApplePaySetup: jest.fn(async () => ({
    error: null,
  })),
  collectBankAccountForPayment: jest.fn(async () => ({
    paymentIntent: {},
    error: null,
  })),
  collectBankAccountForSetup: jest.fn(async () => ({
    setupIntent: {},
    error: null,
  })),
  collectBankAccountToken: jest.fn(async () => ({
    session: {},
    token: {},
    error: null,
  })),
  collectFinancialConnectionsAccounts: jest.fn(async () => ({
    session: {},
    error: null,
  })),
  canAddCardToWallet: jest.fn(async () => ({
    canAddCard: true,
    details: null,
    error: null,
  })),
  isCardInWallet: jest.fn(async () => ({
    isInWallet: false,
    token: {},
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
  usePlatformPay: jest.fn(() => ({
    loading: false,
    isPlatformPaySupported: true,
    confirmPlatformPaySetupIntent: jest.fn(async () => ({
      ...mockFunctions.confirmPlatformPaySetupIntent(),
    })),
    confirmPlatformPayPayment: jest.fn(async () => ({
      ...mockFunctions.confirmPlatformPayPayment(),
    })),
    dismissPlatformPay: jest.fn(async () => ({
      ...mockFunctions.dismissPlatformPay(),
    })),
    createPlatformPayPaymentMethod: jest.fn(async () => ({
      ...mockFunctions.createPlatformPayPaymentMethod(),
    })),
    createPlatformPayToken: jest.fn(async () => ({
      ...mockFunctions.createPlatformPayToken(),
    })),
    updatePlatformPaySheet: jest.fn(async () => ({
      ...mockFunctions.updatePlatformPaySheet(),
    })),
    openPlatformPaySetup: jest.fn(async () => ({
      ...mockFunctions.openPlatformPaySetup(),
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
  useFinancialConnectionsSheet: jest.fn(() => ({
    loading: false,
    collectBankAccountToken: jest.fn(async () => ({
      ...mockFunctions.collectBankAccountToken(),
    })),
    collectFinancialConnectionsAccounts: jest.fn(async () => ({
      ...mockFunctions.collectFinancialConnectionsAccounts(),
    })),
  })),
};

module.exports = {
  ...mockFunctions,
  ...mockHooks,
  StripeContainer: () => 'StripeContainer',
  StripeProvider: () => 'StripeProvider',
  CardField: () => 'CardField',
  CardForm: () => 'CardForm',
  ApplePayButton: () => 'ApplePayButton',
  AuBECSDebitForm: () => 'AuBECSDebitForm',
  GooglePayButton: () => 'GooglePayButton',
  AddToWalletButton: () => 'AddToWalletButton',
  PlatformPayButton: () => 'PlatformPayButton',
  useStripe: jest.fn(() => mockFunctions),
};
