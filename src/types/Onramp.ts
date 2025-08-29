import type { Address } from './Common';

export type OnrampConfiguration = {
  merchantDisplayName: string;
  appearance: LinkAppearance;
};

export type LinkAppearance = {
  lightColors?: LinkColors;
  darkColors?: LinkColors;
  style?: LinkStyle;
  primaryButton?: LinkPrimaryButton;
};

export type LinkColors = {
  primary: string;
  contentOnPrimary: string;
  borderSelected: string;
};

export type LinkStyle = 'AUTOMATIC' | 'ALWAYS_LIGHT' | 'ALWAYS_DARK';

export type LinkPrimaryButton = {
  cornerRadius?: number;
  height?: number;
};

export type LinkUserInfo = {
  email: string;
  phone: string;
  country: string;
  fullName?: string;
};

export enum CryptoNetwork {
  bitcoin = 'bitcoin',
  ethereum = 'ethereum',
  solana = 'solana',
  polygon = 'polygon',
  stellar = 'stellar',
  avalanche = 'avalanche',
  base = 'base',
  aptos = 'aptos',
  optimism = 'optimism',
  worldchain = 'worldchain',
  xrpl = 'xrpl',
}

export type DateOfBirth = {
  day: number;
  month: number;
  year: number;
};

export type KycInfo = {
  firstName: string;
  lastName: string;
  idNumber?: string;
  dateOfBirth: DateOfBirth;
  address: Address;
};
