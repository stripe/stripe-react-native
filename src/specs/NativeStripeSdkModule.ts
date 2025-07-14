import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import type {
  EventEmitter,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';
import type {
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  ConfirmPaymentResult,
  ConfirmPaymentSheetPaymentResult,
  ConfirmSetupIntentResult,
  CreatePaymentMethodResult,
  CreateTokenForCVCUpdateResult,
  CreateTokenResult,
  CustomerAdapter,
  CustomerSheetError,
  CustomerSheetInitParams,
  CustomerSheetPresentParams,
  CustomerSheetResult,
  FinancialConnections,
  HandleNextActionForSetupResult,
  HandleNextActionResult,
  InitialiseParams,
  InitPaymentSheetResult,
  IsCardInWalletResult,
  OpenApplePaySetupResult,
  PaymentIntent,
  PaymentMethod,
  PaymentSheet,
  PlatformPay,
  PresentPaymentSheetResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  SetupIntent,
  StripeError,
  Token,
  VerifyMicrodepositsParams,
} from '../types';
import type {
  EmbeddedPaymentElementConfiguration,
  EmbeddedPaymentElementResult,
} from '../types/EmbeddedPaymentElement';
import type { FinancialConnectionsEvent } from '../types/FinancialConnections';
import type { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeObject } from './utils';

type CustomerSheetInitResult = UnsafeObject<{
  error?: StripeError<CustomerSheetError>;
}>;

export interface Spec extends TurboModule {
  initialise(params: UnsafeObject<InitialiseParams>): Promise<void>;
  createPaymentMethod(
    params: UnsafeObject<PaymentMethod.CreateParams>,
    options: UnsafeObject<PaymentMethod.CreateOptions>
  ): Promise<CreatePaymentMethodResult>;
  handleNextAction(
    paymentIntentClientSecret: string,
    returnURL?: string | null
  ): Promise<HandleNextActionResult>;
  handleNextActionForSetup(
    setupIntentClientSecret: string,
    returnURL?: string | null
  ): Promise<HandleNextActionForSetupResult>;
  confirmPayment(
    paymentIntentClientSecret: string,
    params?: UnsafeObject<PaymentIntent.ConfirmParams>,
    options?: UnsafeObject<PaymentIntent.ConfirmOptions>
  ): Promise<ConfirmPaymentResult>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    params: UnsafeObject<SetupIntent.ConfirmParams>,
    options: UnsafeObject<SetupIntent.ConfirmOptions>
  ): Promise<ConfirmSetupIntentResult>;
  retrievePaymentIntent(
    clientSecret: string
  ): Promise<RetrievePaymentIntentResult>;
  retrieveSetupIntent(clientSecret: string): Promise<RetrieveSetupIntentResult>;
  initPaymentSheet(
    params: UnsafeObject<PaymentSheet.SetupParams>
  ): Promise<InitPaymentSheetResult>;
  intentCreationCallback(
    result: UnsafeObject<PaymentSheet.IntentCreationCallbackParams>
  ): Promise<void>;
  customPaymentMethodResultCallback(
    result: UnsafeObject<PaymentSheet.CustomPaymentMethodResult>
  ): Promise<void>;
  presentPaymentSheet(
    options: UnsafeObject<PaymentSheet.PresentOptions>
  ): Promise<PresentPaymentSheetResult>;
  confirmPaymentSheetPayment(): Promise<ConfirmPaymentSheetPaymentResult>;
  createTokenForCVCUpdate(cvc: string): Promise<CreateTokenForCVCUpdateResult>;
  handleURLCallback(url: string): Promise<boolean>;
  createToken(
    params: UnsafeObject<Token.CreateParams>
  ): Promise<CreateTokenResult>;
  openApplePaySetup(): Promise<OpenApplePaySetupResult>;
  verifyMicrodeposits(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: UnsafeObject<VerifyMicrodepositsParams>
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  collectBankAccount(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: UnsafeObject<
      Omit<PaymentMethod.CollectBankAccountParams, 'onEvent'>
    >
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  getConstants(): { API_VERSIONS: { CORE: string; ISSUING: string } };
  canAddCardToWallet(
    params: UnsafeObject<CanAddCardToWalletParams>
  ): Promise<CanAddCardToWalletResult>;
  isCardInWallet(
    params: UnsafeObject<{ cardLastFour: string }>
  ): Promise<IsCardInWalletResult>;
  collectBankAccountToken(
    clientSecret: string,
    params: UnsafeObject<PaymentMethod.CollectBankAccountTokenParams>
  ): Promise<FinancialConnections.TokenResult>;
  collectFinancialConnectionsAccounts(
    clientSecret: string,
    params: UnsafeObject<FinancialConnections.CollectFinancialConnectionsAccountsParams>
  ): Promise<FinancialConnections.SessionResult>;
  resetPaymentSheetCustomer(): Promise<null>;
  isPlatformPaySupported(
    params: UnsafeObject<{ googlePay?: PlatformPay.IsGooglePaySupportedParams }>
  ): Promise<boolean>;
  createPlatformPayPaymentMethod(
    params: UnsafeObject<PlatformPay.PaymentMethodParams>,
    usesDeprecatedTokenFlow: boolean
  ): Promise<PlatformPay.PaymentMethodResult | PlatformPay.TokenResult>;
  dismissPlatformPay(): Promise<boolean>;
  updatePlatformPaySheet(
    summaryItems: ReadonlyArray<UnsafeObject<PlatformPay.CartSummaryItem>>,
    shippingMethods: ReadonlyArray<UnsafeObject<PlatformPay.ShippingMethod>>,
    errors: ReadonlyArray<PlatformPay.ApplePaySheetError>
  ): Promise<void>;
  confirmPlatformPay(
    clientSecret: string,
    params: UnsafeObject<PlatformPay.ConfirmParams>,
    isPaymentIntent: boolean
  ): Promise<
    PlatformPay.ConfirmPaymentResult | PlatformPay.ConfirmSetupIntentResult
  >;
  configureOrderTracking(
    orderTypeIdentifier: string,
    orderIdentifier: string,
    webServiceUrl: string,
    authenticationToken: string
  ): Promise<void>;
  initCustomerSheet(
    params: UnsafeObject<CustomerSheetInitParams>,
    customerAdapterOverrides: UnsafeObject<{
      [Property in keyof CustomerAdapter]: boolean;
    }>
  ): Promise<CustomerSheetInitResult>;
  presentCustomerSheet(
    params: UnsafeObject<CustomerSheetPresentParams>
  ): Promise<CustomerSheetResult>;
  retrieveCustomerSheetPaymentOptionSelection(): Promise<CustomerSheetResult>;
  customerAdapterFetchPaymentMethodsCallback(
    paymentMethods: ReadonlyArray<Object>
  ): Promise<void>;
  customerAdapterAttachPaymentMethodCallback(
    paymentMethod: Object
  ): Promise<void>;
  customerAdapterDetachPaymentMethodCallback(
    paymentMethod: Object
  ): Promise<void>;
  customerAdapterSetSelectedPaymentOptionCallback(): Promise<void>;
  customerAdapterFetchSelectedPaymentOptionCallback(
    paymentOption: string | null
  ): Promise<void>;
  customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
    clientSecret: string
  ): Promise<void>;
  createEmbeddedPaymentElement(
    intentConfig: UnsafeObject<IntentConfiguration>,
    configuration: UnsafeObject<EmbeddedPaymentElementConfiguration>
  ): Promise<void>;
  confirmEmbeddedPaymentElement(
    viewTag: Int32
  ): Promise<EmbeddedPaymentElementResult>;
  updateEmbeddedPaymentElement(
    intentConfig: UnsafeObject<IntentConfiguration>
  ): Promise<void>;
  clearEmbeddedPaymentOption(viewTag: Int32): Promise<void>;

  // Events
  onConfirmHandlerCallback: EventEmitter<{
    paymentMethod: UnsafeObject<PaymentMethod.Result>;
    shouldSavePaymentMethod: boolean;
  }>;
  onFinancialConnectionsEvent: EventEmitter<
    UnsafeObject<FinancialConnectionsEvent>
  >;
  onOrderTrackingCallback: EventEmitter<void>;
  onCustomerAdapterFetchPaymentMethodsCallback: EventEmitter<void>;
  onCustomerAdapterAttachPaymentMethodCallback: EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterDetachPaymentMethodCallback: EventEmitter<{
    paymentMethodId: string;
  }>;
  onCustomerAdapterSetSelectedPaymentOptionCallback: EventEmitter<{
    paymentOption: string;
  }>;
  onCustomerAdapterFetchSelectedPaymentOptionCallback: EventEmitter<void>;
  onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback: EventEmitter<void>;
  embeddedPaymentElementDidUpdateHeight: EventEmitter<UnsafeObject<any>>;
  embeddedPaymentElementWillPresent: EventEmitter<void>;
  embeddedPaymentElementDidUpdatePaymentOption: EventEmitter<UnsafeObject<any>>;
  embeddedPaymentElementFormSheetConfirmComplete: EventEmitter<
    UnsafeObject<any>
  >;
  embeddedPaymentElementRowSelectionImmediateAction: EventEmitter<void>;
  embeddedPaymentElementLoadingFailed: EventEmitter<UnsafeObject<any>>;
  onCustomPaymentMethodConfirmHandlerCallback: EventEmitter<UnsafeObject<any>>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StripeSdk');
