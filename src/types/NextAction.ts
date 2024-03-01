export type NextAction =
  | VerifyWithMicrodepositsAction
  | UrlRedirectAction
  | WeChatRedirectAction
  | AlipayRedirectAction
  | BoletoVoucherAction
  | OxxoVoucherAction;

export type VerifyWithMicrodepositsAction = {
  type: 'verifyWithMicrodeposits';
  redirectUrl: string;
  microdepositType: string;
  arrivalDate: string;
};

export type UrlRedirectAction = {
  type: 'urlRedirect';
  redirectUrl: string;
};

export type WeChatRedirectAction = {
  type: 'weChatRedirect';
  redirectUrl: string;
};

export type AlipayRedirectAction = {
  type: 'alipayRedirect';
  redirectUrl: string;
  nativeRedirectUrl: string;
};

export type BoletoVoucherAction = {
  type: 'boletoVoucher';
  voucherURL: string;
};

export type KonbiniVoucherAction = {
  type: 'konbiniVoucher';
  voucherURL: string;
};

export type OxxoVoucherAction = {
  type: 'oxxoVoucher';
  expiration: number;
  voucherURL: string;
  voucherNumber: string;
};
