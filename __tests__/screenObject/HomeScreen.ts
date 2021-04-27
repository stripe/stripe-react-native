import { getElementByText } from '../helpers';

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
];

class HomeScreen {
  goTo(screen: typeof SCREENS[number]) {
    getElementByText(screen).click();
  }
}

export default new HomeScreen();
