import { NativeModules } from 'react-native';
import type {
  PaymentMethod,
  PaymentIntent,
  PlatformPay,
  PaymentSheet,
  SetupIntent,
  InitialiseParams,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  ConfirmPaymentResult,
  HandleNextActionResult,
  HandleNextActionForSetupResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  CreateTokenResult,
  OpenApplePaySetupResult,
  Token,
  VerifyMicrodepositsParams,
  IsCardInWalletResult,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  FinancialConnections,
  CustomerSheetInitParams,
  CustomerSheetPresentParams,
  CustomerSheetResult,
  CustomerSheetError,
  StripeError,
  CustomerPaymentOption,
  CustomerAdapter,
} from './types';

type NativeStripeSdkType = {
  initialise(params: InitialiseParams): Promise<void>;
  createPaymentMethod(
    params: PaymentMethod.CreateParams,
    options: PaymentMethod.CreateOptions
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
    params?: PaymentIntent.ConfirmParams,
    options?: PaymentIntent.ConfirmOptions
  ): Promise<ConfirmPaymentResult>;
  confirmSetupIntent(
    paymentIntentClientSecret: string,
    params: SetupIntent.ConfirmParams,
    options: SetupIntent.ConfirmOptions
  ): Promise<ConfirmSetupIntentResult>;
  retrievePaymentIntent(
    clientSecret: string
  ): Promise<RetrievePaymentIntentResult>;
  retrieveSetupIntent(clientSecret: string): Promise<RetrieveSetupIntentResult>;
  initPaymentSheet(
    params: PaymentSheet.SetupParams
  ): Promise<InitPaymentSheetResult>;
  intentCreationCallback(
    result: PaymentSheet.IntentCreationCallbackParams
  ): void;
  presentPaymentSheet(
    options: PaymentSheet.PresentOptions
  ): Promise<PresentPaymentSheetResult>;
  confirmPaymentSheetPayment(): Promise<ConfirmPaymentSheetPaymentResult>;
  createTokenForCVCUpdate(cvc: string): Promise<CreateTokenForCVCUpdateResult>;
  handleURLCallback(url: string): Promise<boolean>;
  createToken(params: Token.CreateParams): Promise<CreateTokenResult>;
  openApplePaySetup(): Promise<OpenApplePaySetupResult>;
  verifyMicrodeposits(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: VerifyMicrodepositsParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  collectBankAccount(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: PaymentMethod.CollectBankAccountParams
  ): Promise<ConfirmSetupIntentResult | ConfirmPaymentResult>;
  getConstants(): { API_VERSIONS: { CORE: string; ISSUING: string } };
  canAddCardToWallet(
    params: CanAddCardToWalletParams
  ): Promise<CanAddCardToWalletResult>;
  isCardInWallet(params: {
    cardLastFour: string;
  }): Promise<IsCardInWalletResult>;
  collectBankAccountToken(
    clientSecret: string
  ): Promise<FinancialConnections.TokenResult>;
  collectFinancialConnectionsAccounts(
    clientSecret: string
  ): Promise<FinancialConnections.SessionResult>;
  resetPaymentSheetCustomer(): Promise<null>;
  isPlatformPaySupported(params: {
    googlePay?: PlatformPay.IsGooglePaySupportedParams;
  }): Promise<boolean>;
  createPlatformPayPaymentMethod(
    params: PlatformPay.PaymentMethodParams,
    usesDeprecatedTokenFlow: boolean
  ): Promise<PlatformPay.PaymentMethodResult | PlatformPay.TokenResult>;
  dismissPlatformPay(): Promise<boolean>;
  updatePlatformPaySheet(
    summaryItems: Array<PlatformPay.CartSummaryItem>,
    shippingMethods: Array<PlatformPay.ShippingMethod>,
    errors: Array<PlatformPay.ApplePaySheetError>
  ): Promise<void>;
  confirmPlatformPay(
    clientSecret: string,
    params: PlatformPay.ConfirmParams,
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
    params: CustomerSheetInitParams,
    customerAdapterOverrides: { [Property in keyof CustomerAdapter]: boolean }
  ): Promise<{ error?: StripeError<CustomerSheetError> }>;
  presentCustomerSheet(
    params: CustomerSheetPresentParams
  ): Promise<CustomerSheetResult>;
  retrieveCustomerSheetPaymentOptionSelection(): Promise<CustomerSheetResult>;
  customerAdapterFetchPaymentMethodsCallback(
    paymentMethods: Array<object>
  ): Promise<void>;
  customerAdapterAttachPaymentMethodCallback(
    paymentMethod: object
  ): Promise<void>;
  customerAdapterDetachPaymentMethodCallback(
    paymentMethod: object
  ): Promise<void>;
  customerAdapterSetSelectedPaymentOptionCallback(): Promise<void>;
  customerAdapterFetchSelectedPaymentOptionCallback(
    paymentOption: CustomerPaymentOption | null
  ): Promise<void>;
  customerAdapterSetupIntentClientSecretForCustomerAttachCallback(
    clientSecret: String
  ): Promise<void>;
};

const { StripeSdk } = NativeModules;

export default StripeSdk as NativeStripeSdkType;
