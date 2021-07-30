/* eslint-disable no-undef */

const SCREENS = <const>[
  'Accept a payment',
  'More payment scenarios',
  'Set up future payments',
  'inalize payments on the server',
  'Bank Debits',
  'SEPA Direct Debit payment',
  'SEPA Direct Debit set up',
  'Bank redirects',
  'Bancontact Payment',
  'Bancontact SEPA Direct Debit set up',
  'EPS',
  'FPX',
  'giropay',
  'iDEAL payment',
  'iDEAL SEPA Direct Debit set up',
  'Przelewy24',
  'Sofort',
  'Sofort SEPA Direct Debit set up',
  'Buy now pay later',
  'Afterpay and Clearpay',
  'Vouchers',
  'Wallets',
  'Alipay',
  'Apple Pay',
  'GrabPay',
  'OXXO',
  'Finalize payments on the server',
  'Recollect a CVC',
  'Card element only',
  'BECS Direct Debit payment',
  'BECS Direct Debit set up',
  'WeChat Pay',
];

class HomeScreen {
  goTo(screen: typeof SCREENS[number]) {
    const button = driver.isAndroid
      ? $(
          `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${screen}"))`
        )
      : $(`~${screen}`);
    expect(button).toBeDisplayed();
    button.click();
  }
}

export default new HomeScreen();
