declare const SCREENS: readonly ["Accept a payment", "More payment scenarios", "Set up future payments", "inalize payments on the server", "Bank Debits", "SEPA Direct Debit payment", "SEPA Direct Debit set up", "Bank redirects", "Bancontact Payment", "Bancontact SEPA Direct Debit set up", "EPS", "FPX", "giropay", "iDEAL payment", "iDEAL SEPA Direct Debit set up", "Przelewy24", "Sofort", "Sofort SEPA Direct Debit set up", "Buy now pay later", "Afterpay and Clearpay", "Vouchers", "Wallets", "Alipay", "Apple Pay", "GrabPay", "OXXO", "Finalize payments on the server", "Recollect a CVC", "Card element only", "BECS Direct Debit payment", "BECS Direct Debit set up", "WeChat Pay"];
declare class HomeScreen {
    goTo(screen: typeof SCREENS[number]): void;
}
declare const _default: HomeScreen;
export default _default;
