/* eslint-disable no-undef */

const React = require('react');

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
    paymentIntent: {},
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
    confirmPayment: jest.fn((...args) => mockFunctions.confirmPayment(...args)),
  })),
  useConfirmSetupIntent: jest.fn(() => ({
    confirmSetupIntent: jest.fn((...args) =>
      mockFunctions.confirmSetupIntent(...args)
    ),
  })),
  usePlatformPay: jest.fn(() => ({
    loading: false,
    isPlatformPaySupported: jest.fn((...args) =>
      mockFunctions.isPlatformPaySupported(...args)
    ),
    confirmPlatformPaySetupIntent: jest.fn((...args) =>
      mockFunctions.confirmPlatformPaySetupIntent(...args)
    ),
    confirmPlatformPayPayment: jest.fn((...args) =>
      mockFunctions.confirmPlatformPayPayment(...args)
    ),
    dismissPlatformPay: jest.fn((...args) =>
      mockFunctions.dismissPlatformPay(...args)
    ),
    createPlatformPayPaymentMethod: jest.fn((...args) =>
      mockFunctions.createPlatformPayPaymentMethod(...args)
    ),
    createPlatformPayToken: jest.fn((...args) =>
      mockFunctions.createPlatformPayToken(...args)
    ),
    updatePlatformPaySheet: jest.fn((...args) =>
      mockFunctions.updatePlatformPaySheet(...args)
    ),
    openPlatformPaySetup: jest.fn((...args) =>
      mockFunctions.openPlatformPaySetup(...args)
    ),
  })),
  usePaymentSheet: jest.fn(() => ({
    loading: false,
    initPaymentSheet: jest.fn((...args) =>
      mockFunctions.initPaymentSheet(...args)
    ),
    presentPaymentSheet: jest.fn((...args) =>
      mockFunctions.presentPaymentSheet(...args)
    ),
    confirmPaymentSheetPayment: jest.fn((...args) =>
      mockFunctions.confirmPaymentSheetPayment(...args)
    ),
  })),
  useFinancialConnectionsSheet: jest.fn(() => ({
    loading: false,
    collectBankAccountToken: jest.fn((...args) =>
      mockFunctions.collectBankAccountToken(...args)
    ),
    collectFinancialConnectionsAccounts: jest.fn((...args) =>
      mockFunctions.collectFinancialConnectionsAccounts(...args)
    ),
  })),
  useEmbeddedPaymentElement: jest.fn((intentConfig, configuration) => ({
    embeddedPaymentElementView: React.createElement('View', {
      testID: 'embedded-payment-element-view',
      style: { width: '100%', height: 200 },
    }),
    paymentOption: {
      label: 'Card ending in 4242',
      paymentMethodType: 'card',
      billingDetails: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: {
          country: 'US',
          postalCode: '12345',
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
        },
      },
    },
    confirm: jest.fn(async () => ({
      status: 'completed',
    })),
    update: jest.fn(() => {}),
    clearPaymentOption: jest.fn(() => {}),
    loadingError: null,
  })),
};

// Stripe constants and enums for testing - matches runtime exports
const StripeConstants = {
  // PlatformPay enums
  PlatformPay: {
    PaymentType: {
      Immediate: 'Immediate',
      Deferred: 'Deferred',
      Recurring: 'Recurring',
    },
    BillingAddressFormat: {
      Full: 'FULL',
      Min: 'MIN',
    },
    ContactField: {
      EmailAddress: 'emailAddress',
      Name: 'name',
      PhoneNumber: 'phoneNumber',
      PhoneticName: 'phoneticName',
      PostalAddress: 'postalAddress',
    },
  },

  // Error enums
  PlatformPayError: {
    Canceled: 'Canceled',
    Failed: 'Failed',
    Unknown: 'Unknown',
  },

  // PaymentSheet enums
  PaymentSheet: {
    CollectionMode: {
      AUTOMATIC: 'automatic',
      NEVER: 'never',
      ALWAYS: 'always',
    },
    AddressCollectionMode: {
      AUTOMATIC: 'automatic',
      NEVER: 'never',
      FULL: 'full',
    },
    CardBrandCategory: {
      Visa: 'visa',
      Mastercard: 'mastercard',
      Amex: 'amex',
      Discover: 'discover',
    },
    CardBrandAcceptanceFilter: {
      All: 'all',
      Allowed: 'allowed',
      Disallowed: 'disallowed',
    },
    CardFundingType: {
      Debit: 'debit',
      Credit: 'credit',
      Prepaid: 'prepaid',
      Unknown: 'unknown',
    },
    CustomPaymentMethodResultStatus: {
      Completed: 'completed',
      Canceled: 'canceled',
      Failed: 'failed',
    },
  },
};

// EmbeddedPaymentElement constants and enums for testing
const EmbeddedPaymentElementMocks = {
  // Result status constants (from EmbeddedPaymentElementResult)
  EmbeddedPaymentElementStatus: {
    COMPLETED: 'completed',
    CANCELED: 'canceled',
    FAILED: 'failed',
  },

  // Form sheet action types (from EmbeddedFormSheetAction)
  EmbeddedFormSheetActionType: {
    CONFIRM: 'confirm',
    CONTINUE: 'continue',
  },

  // Row selection behavior types (from EmbeddedRowSelectionBehavior)
  EmbeddedRowSelectionBehaviorType: {
    DEFAULT: 'default',
    IMMEDIATE_ACTION: 'immediateAction',
  },

  // Row display styles for Embedded Payment Element (from PaymentSheet.RowStyle)
  RowStyle: {
    FlatWithRadio: 'flatWithRadio',
    FloatingButton: 'floatingButton',
    FlatWithCheckmark: 'flatWithCheckmark',
    FlatWithDisclosure: 'flatWithDisclosure',
  },

  // Mock payment method types commonly used with EmbeddedPaymentElement
  PaymentMethodTypes: {
    CARD: 'card',
    APPLE_PAY: 'apple_pay',
    GOOGLE_PAY: 'google_pay',
    LINK: 'link',
    KLARNA: 'klarna',
    AFTERPAY: 'afterpay_clearpay',
    US_BANK_ACCOUNT: 'us_bank_account',
    SEPA_DEBIT: 'sepa_debit',
  },

  // Mock test helpers for different payment option states
  mockPaymentOptions: {
    card: {
      label: 'Card ending in 4242',
      paymentMethodType: 'card',
      billingDetails: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: {
          country: 'US',
          postalCode: '12345',
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
        },
      },
    },
    applePay: {
      label: 'Apple Pay',
      paymentMethodType: 'apple_pay',
      billingDetails: {
        name: 'John Doe',
      },
    },
    googlePay: {
      label: 'Google Pay',
      paymentMethodType: 'google_pay',
      billingDetails: {
        name: 'John Doe',
      },
    },
    link: {
      label: 'Link',
      paymentMethodType: 'link',
      billingDetails: {
        email: 'john.doe@example.com',
      },
    },
    null: null,
  },

  // Mock results for different scenarios
  mockResults: {
    completed: { status: 'completed' },
    canceled: { status: 'canceled' },
    failed: { status: 'failed', error: new Error('Payment failed') },
    networkError: { status: 'failed', error: new Error('Network error') },
  },
};

module.exports = {
  ...mockFunctions,
  ...mockHooks,
  ...StripeConstants,
  ...EmbeddedPaymentElementMocks,
  StripeContainer: () => 'StripeContainer',
  StripeProvider: () => 'StripeProvider',
  CardField: () => 'CardField',
  CardForm: () => 'CardForm',
  ApplePayButton: () => 'ApplePayButton',
  AuBECSDebitForm: () => 'AuBECSDebitForm',
  GooglePayButton: () => 'GooglePayButton',
  AddToWalletButton: () => 'AddToWalletButton',
  PlatformPayButton: () => 'PlatformPayButton',
  PaymentMethodMessagingElement: () => 'PaymentMethodMessagingElementView',
  useStripe: jest.fn(() => mockFunctions),
};

// Mock NativeStripeSdkModule with getConstants for system info
jest.mock('../src/specs/NativeStripeSdkModule', () => ({
  default: {
    getConstants: jest.fn(() => ({
      API_VERSIONS: {
        CORE: '2024-12-15',
        ISSUING: '2024-12-15',
      },
      SYSTEM_INFO: {
        sdkVersion: '1.0.0',
        osVersion: '18.0',
        deviceType: 'iPhone14,5',
        appName: 'TestApp',
        appVersion: '1.0.0',
        isNewArchitecture: false,
        reactNativeVersion: '0.81.5',
      },
    })),
    openAuthenticatedWebView: jest.fn(),
    createEmbeddedPaymentElement: jest.fn(async () => undefined),
    confirmEmbeddedPaymentElement: jest.fn(async () => ({
      status: 'completed',
    })),
    updateEmbeddedPaymentElement: jest.fn(async () => ({
      status: 'succeeded',
    })),
    clearEmbeddedPaymentOption: jest.fn(async () => undefined),
  },
}));
