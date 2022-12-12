import NativeStripeSdk from './spec/NativeStripeSdk';
import type { NativeStripeSdkType } from './NativeStripeSdk';
import type {
  PaymentMethod,
  PaymentIntent,
  ApplePay,
  PaymentSheet,
  SetupIntent,
  InitialiseParams,
  CreatePaymentMethodResult,
  RetrievePaymentIntentResult,
  RetrieveSetupIntentResult,
  ConfirmPaymentResult,
  HandleNextActionResult,
  ConfirmSetupIntentResult,
  CreateTokenForCVCUpdateResult,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
  ConfirmPaymentSheetPaymentResult,
  ApplePayResult,
  CreateTokenResult,
  GooglePayInitResult,
  PayWithGooglePayResult,
  CreateGooglePayPaymentMethodResult,
  GooglePay,
  OpenApplePaySetupResult,
  Token,
  VerifyMicrodepositsParams,
  IsCardInWalletResult,
  CanAddCardToWalletParams,
  CanAddCardToWalletResult,
  FinancialConnections,
} from './types';

class StripeSdk implements NativeStripeSdkType {
  initialise(params: InitialiseParams): Promise<void> {
    return NativeStripeSdk.initialise(params);
  }

  createPaymentMethod(
    params: PaymentMethod.CreateParams,
    options: PaymentMethod.CreateOptions
  ): Promise<CreatePaymentMethodResult> {
    return NativeStripeSdk.createPaymentMethod(
      params,
      options
    ) as Promise<CreatePaymentMethodResult>;
  }

  handleNextAction(
    paymentIntentClientSecret: string,
    returnURL?: string | null | undefined
  ): Promise<HandleNextActionResult> {
    return NativeStripeSdk.handleNextAction(
      paymentIntentClientSecret,
      returnURL
    ) as Promise<HandleNextActionResult>;
  }

  confirmPayment(
    paymentIntentClientSecret: string,
    params?: PaymentIntent.ConfirmParams,
    options?: PaymentIntent.ConfirmOptions
  ): Promise<ConfirmPaymentResult> {
    return NativeStripeSdk.confirmPayment(
      paymentIntentClientSecret,
      params,
      options
    ) as Promise<ConfirmPaymentResult>;
  }

  isApplePaySupported(): Promise<boolean> {
    return NativeStripeSdk.isApplePaySupported();
  }

  presentApplePay(params: ApplePay.PresentParams): Promise<ApplePayResult> {
    return NativeStripeSdk.presentApplePay(params) as Promise<ApplePayResult>;
  }

  confirmApplePayPayment(clientSecret: string): Promise<void> {
    return NativeStripeSdk.confirmApplePayPayment(
      clientSecret
    ) as Promise<void>;
  }

  updateApplePaySummaryItems(
    summaryItems: ApplePay.CartSummaryItem[],
    errorAddressFields: {
      field: ApplePay.AddressFields;
      message?: string | undefined;
    }[]
  ): Promise<void> {
    return NativeStripeSdk.updateApplePaySummaryItems(
      summaryItems,
      errorAddressFields
    );
  }

  confirmSetupIntent(
    paymentIntentClientSecret: string,
    params: SetupIntent.ConfirmParams,
    options: SetupIntent.ConfirmOptions
  ): Promise<ConfirmSetupIntentResult> {
    return NativeStripeSdk.confirmSetupIntent(
      paymentIntentClientSecret,
      params,
      options
    ) as Promise<ConfirmSetupIntentResult>;
  }

  retrievePaymentIntent(
    clientSecret: string
  ): Promise<RetrievePaymentIntentResult> {
    return NativeStripeSdk.retrievePaymentIntent(
      clientSecret
    ) as Promise<RetrievePaymentIntentResult>;
  }

  retrieveSetupIntent(
    clientSecret: string
  ): Promise<RetrieveSetupIntentResult> {
    return NativeStripeSdk.retrieveSetupIntent(
      clientSecret
    ) as Promise<RetrieveSetupIntentResult>;
  }

  initPaymentSheet(
    params: PaymentSheet.SetupParams
  ): Promise<InitPaymentSheetResult> {
    return NativeStripeSdk.initPaymentSheet(
      params
    ) as Promise<InitPaymentSheetResult>;
  }

  presentPaymentSheet(): Promise<PresentPaymentSheetResult> {
    return NativeStripeSdk.presentPaymentSheet() as Promise<PresentPaymentSheetResult>;
  }

  confirmPaymentSheetPayment(): Promise<ConfirmPaymentSheetPaymentResult> {
    return NativeStripeSdk.confirmPaymentSheetPayment() as Promise<ConfirmPaymentSheetPaymentResult>;
  }
  createTokenForCVCUpdate(cvc: string): Promise<CreateTokenForCVCUpdateResult> {
    return NativeStripeSdk.createTokenForCVCUpdate(
      cvc
    ) as Promise<CreateTokenForCVCUpdateResult>;
  }
  handleURLCallback(url: string): Promise<boolean> {
    return NativeStripeSdk.handleURLCallback(url);
  }

  createToken(params: Token.CreateParams): Promise<CreateTokenResult> {
    return NativeStripeSdk.createToken(params) as Promise<CreateTokenResult>;
  }

  isGooglePaySupported(params: GooglePay.IsSupportedParams): Promise<boolean> {
    return NativeStripeSdk.isGooglePaySupported(params) as Promise<boolean>;
  }

  initGooglePay(params: GooglePay.InitParams): Promise<GooglePayInitResult> {
    return NativeStripeSdk.initGooglePay(
      params
    ) as Promise<GooglePayInitResult>;
  }

  presentGooglePay(
    params: GooglePay.PresentParams
  ): Promise<PayWithGooglePayResult> {
    return NativeStripeSdk.presentGooglePay(
      params
    ) as Promise<PayWithGooglePayResult>;
  }

  createGooglePayPaymentMethod(
    params: GooglePay.CreatePaymentMethodParams
  ): Promise<CreateGooglePayPaymentMethodResult> {
    return NativeStripeSdk.createGooglePayPaymentMethod(
      params
    ) as Promise<CreateGooglePayPaymentMethodResult>;
  }

  openApplePaySetup(): Promise<OpenApplePaySetupResult> {
    return NativeStripeSdk.openApplePaySetup() as Promise<OpenApplePaySetupResult>;
  }

  verifyMicrodeposits(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: VerifyMicrodepositsParams
  ): Promise<ConfirmPaymentResult | ConfirmSetupIntentResult> {
    return NativeStripeSdk.verifyMicrodeposits(
      isPaymentIntent,
      clientSecret,
      params
    ) as Promise<ConfirmPaymentResult | ConfirmSetupIntentResult>;
  }

  collectBankAccount(
    isPaymentIntent: boolean,
    clientSecret: string,
    params: PaymentMethod.CollectBankAccountParams
  ): Promise<ConfirmPaymentResult | ConfirmSetupIntentResult> {
    return NativeStripeSdk.collectBankAccount(
      isPaymentIntent,
      clientSecret,
      params
    ) as Promise<ConfirmPaymentResult | ConfirmSetupIntentResult>;
  }

  getConstants(): { API_VERSIONS: { CORE: string; ISSUING: string } } {
    return NativeStripeSdk.getConstants();
  }

  canAddCardToWallet(
    params: CanAddCardToWalletParams
  ): Promise<CanAddCardToWalletResult> {
    return NativeStripeSdk.canAddCardToWallet(
      params
    ) as Promise<CanAddCardToWalletResult>;
  }

  isCardInWallet(params: {
    cardLastFour: string;
  }): Promise<IsCardInWalletResult> {
    return NativeStripeSdk.isCardInWallet(
      params
    ) as Promise<IsCardInWalletResult>;
  }

  collectBankAccountToken(
    clientSecret: string
  ): Promise<FinancialConnections.TokenResult> {
    return NativeStripeSdk.collectBankAccountToken(
      clientSecret
    ) as Promise<FinancialConnections.TokenResult>;
  }
  collectFinancialConnectionsAccounts(
    clientSecret: string
  ): Promise<FinancialConnections.SessionResult> {
    return NativeStripeSdk.collectFinancialConnectionsAccounts(
      clientSecret
    ) as Promise<FinancialConnections.SessionResult>;
  }

  resetPaymentSheetCustomer(): Promise<null> {
    return NativeStripeSdk.resetPaymentSheetCustomer();
  }
}

const Instance = new StripeSdk();
export default Instance;
