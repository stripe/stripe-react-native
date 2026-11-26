import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';
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
  LinkController,
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
  CreateRadarSessionResult,
} from '../types';
import type {
  EmbeddedPaymentElementConfiguration,
  EmbeddedPaymentElementResult,
} from '../types/EmbeddedPaymentElement';
import type { IntentConfiguration } from '../types/PaymentSheet';
import type { CheckoutElements } from '../types/CheckoutElements';
import type { UnsafeObject } from './utils';
import type { FinancialConnectionsEvent } from '../types/FinancialConnections';
import type { Result as ConfirmationTokenResult } from '../types/ConfirmationToken';
import type { CheckoutControllerUpdate } from '../checkout/CheckoutControllerEventEmitter';

type CustomerSheetInitResult = UnsafeObject<{
  error?: StripeError<CustomerSheetError>;
}>;

export type CheckoutCreateOptions = Omit<
  CheckoutElements.CreateOptions,
  'expressCheckoutElement'
> & {
  expressCheckoutElement?: Omit<
    CheckoutElements.ExpressCheckoutElementConfiguration,
    'onResult'
  >;
};

type CheckoutCreateResult = UnsafeObject<{
  session: CheckoutElements.Session;
  isCurrencySelectorAvailable: boolean;
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
    params: UnsafeObject<PaymentIntent.ConfirmParams> | null,
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
  confirmationTokenCreationCallback(
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
  getConstants(): {
    API_VERSIONS: { CORE: string; ISSUING: string };
    SYSTEM_INFO: {
      sdkVersion: string;
      osVersion: string;
      deviceType: string;
      appName: string;
      appVersion: string;
      isNewArchitecture: boolean;
      reactNativeVersion: string;
    };
  };
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
  clientSecretProviderSetupIntentClientSecretCallback(
    setupIntentClientSecret: string
  ): Promise<void>;
  clientSecretProviderCustomerSessionClientSecretCallback(
    customerSessionClientSecret: UnsafeObject<{
      requestId: string;
      customerId?: string;
      clientSecret?: string;
      error?: string;
    }>
  ): Promise<void>;
  createEmbeddedPaymentElement(
    intentConfig: UnsafeObject<IntentConfiguration>,
    configuration: UnsafeObject<EmbeddedPaymentElementConfiguration>
  ): Promise<void>;
  confirmEmbeddedPaymentElement(
    viewTag: CodegenTypes.Int32
  ): Promise<EmbeddedPaymentElementResult>;
  updateEmbeddedPaymentElement(
    intentConfig: UnsafeObject<IntentConfiguration>
  ): Promise<UnsafeObject<any> | null>;
  clearEmbeddedPaymentOption(viewTag: CodegenTypes.Int32): Promise<void>;
  createRadarSession(): Promise<CreateRadarSessionResult>;

  setFinancialConnectionsForceNativeFlow(enabled: boolean): Promise<void>;

  openAuthenticatedWebView(
    id: string,
    url: string
  ): Promise<{ url?: string } | null>;

  downloadAndShareFile(
    url: string,
    filename?: string | null
  ): Promise<{ success: boolean; error?: string }>;
  authWebViewDeepLinkHandled(id: string): Promise<void>;

  storeStripeConnectDeepLink(url: string): Promise<void>;
  pollAndClearPendingStripeConnectUrls(): Promise<string[]>;

  // LinkController - Private Preview

  /** @PrivatePreview */
  initLinkController(
    params: UnsafeObject<LinkController.Configuration>
  ): Promise<UnsafeObject<LinkController.InitResult>>;

  /** @PrivatePreview */
  presentLinkController(): Promise<UnsafeObject<LinkController.PresentResult>>;

  /** @PrivatePreview */
  confirmLinkControllerSetupIntent(
    params: UnsafeObject<{ clientSecret: string }>
  ): Promise<UnsafeObject<LinkController.ConfirmSetupIntentResult>>;

  // Checkout Session - Private Preview

  /** @CheckoutSessionPrivatePreview */
  createCheckout(
    params: UnsafeObject<CheckoutCreateOptions>,
    controllerId: string
  ): Promise<CheckoutCreateResult>;

  /** @CheckoutSessionPrivatePreview */
  clearCheckoutLocalCustomerData(): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  updateCheckoutEmail(
    controllerId: string,
    email: string | null
  ): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  updateCheckoutShippingAddress(
    controllerId: string,
    params: UnsafeObject<CheckoutElements.UpdateShippingAddressParams>
  ): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  applyCheckoutPromotionCode(
    controllerId: string,
    promotionCode: string
  ): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  removeCheckoutPromotionCode(controllerId: string): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  clearCheckoutPaymentOption(controllerId: string): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  confirmCheckout(
    controllerId: string
  ): Promise<UnsafeObject<CheckoutElements.Result>>;

  /** @CheckoutSessionPrivatePreview */
  presentCheckoutPaymentElement(controllerId: string): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  presentCheckoutShippingAddressElement(controllerId: string): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  destroyCheckout(controllerId: string): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  runCheckoutServerUpdate(
    controllerId: string,
    operationId: string
  ): Promise<void>;

  /** @CheckoutSessionPrivatePreview */
  completeCheckoutServerUpdate(
    controllerId: string,
    operationId: string,
    error: string | null
  ): Promise<void>;

  // Events
  readonly checkoutExpressCheckoutDidComplete: CodegenTypes.EventEmitter<
    UnsafeObject<{ controllerId: string; result: CheckoutElements.Result }>
  >;
  readonly checkoutServerUpdateRequested: CodegenTypes.EventEmitter<{
    controllerId: string;
    operationId: string;
  }>;
  readonly onConfirmHandlerCallback: CodegenTypes.EventEmitter<{
    paymentMethod: UnsafeObject<PaymentMethod.Result>;
    shouldSavePaymentMethod: boolean;
  }>;
  readonly onConfirmationTokenHandlerCallback: CodegenTypes.EventEmitter<{
    confirmationToken: UnsafeObject<ConfirmationTokenResult>;
  }>;
  readonly onFinancialConnectionsEvent: CodegenTypes.EventEmitter<
    UnsafeObject<FinancialConnectionsEvent>
  >;
  readonly onOrderTrackingCallback: CodegenTypes.EventEmitter<void>;
  readonly onCustomerAdapterFetchPaymentMethodsCallback: CodegenTypes.EventEmitter<void>;
  readonly onCustomerAdapterAttachPaymentMethodCallback: CodegenTypes.EventEmitter<{
    paymentMethodId: string;
  }>;
  readonly onCustomerAdapterDetachPaymentMethodCallback: CodegenTypes.EventEmitter<{
    paymentMethodId: string;
  }>;
  readonly onCustomerAdapterSetSelectedPaymentOptionCallback: CodegenTypes.EventEmitter<{
    paymentOption: string;
  }>;
  readonly onCustomerAdapterFetchSelectedPaymentOptionCallback: CodegenTypes.EventEmitter<void>;
  readonly onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback: CodegenTypes.EventEmitter<void>;
  readonly onCustomerSessionProviderSetupIntentClientSecret: CodegenTypes.EventEmitter<void>;
  readonly onCustomerSessionProviderCustomerSessionClientSecret: CodegenTypes.EventEmitter<{
    requestId: string;
  }>;
  readonly embeddedPaymentElementDidUpdateHeight: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly embeddedPaymentElementWillPresent: CodegenTypes.EventEmitter<void>;
  readonly embeddedPaymentElementDidUpdatePaymentOption: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly embeddedPaymentElementFormSheetConfirmComplete: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly embeddedPaymentElementRowSelectionImmediateAction: CodegenTypes.EventEmitter<void>;
  readonly embeddedPaymentElementLoadingFailed: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly embeddedPaymentElementUpdateComplete: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly onCustomPaymentMethodConfirmHandlerCallback: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly paymentMethodMessagingElementDidUpdateHeight: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly paymentMethodMessagingElementConfigureResult: CodegenTypes.EventEmitter<
    UnsafeObject<any>
  >;
  readonly checkoutControllerDidUpdate: CodegenTypes.EventEmitter<
    UnsafeObject<CheckoutControllerUpdate>
  >;
  readonly checkoutControllerDidSelectPaymentOption: CodegenTypes.EventEmitter<{
    controllerId: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StripeSdk');
