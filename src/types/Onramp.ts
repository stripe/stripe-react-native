import type { Address } from './Common';

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

export enum IdType {
  Aadhaar = 'aadhaar',
  Abn = 'abn',
  BusinessTaxDeductionAccountNumber = 'business_tax_deduction_account_number',
  CompanyRegistrationNumber = 'company_registration_number',
  CorporateIdentityNumber = 'corporate_identity_number',
  GoodsAndServicesTaxIdNumber = 'goods_and_services_tax_id_number',
  IndiaImporterExporterCode = 'india_importer_exporter_code',
  ExportLicenseId = 'export_license_id',
  LegacyIdNumber = 'id_number',
  LimitedLiabilityPartnershipId = 'limited_liability_partnership_id',
  Pan = 'pan',
  UdyamNumber = 'udyam_number',
  TaxId = 'tax_id',
  VatId = 'vat_id',
  VoterId = 'voter_id',
  BrazilCpf = 'brazil_cpf',
  BrazilRegistroGeral = 'brazil_registro_geral',
  SpanishPersonNumber = 'spanish_person_number',
  ThLaserCode = 'th_laser_code',
  FiscalCode = 'fiscal_code',
  SocialSecurityNumber = 'social_security_number',
  RegonNumber = 'regon_number',
  PassportNumber = 'passport_number',
  DrivingLicenseNumber = 'driving_license_number',
  PhotoIdNumber = 'photo_id_number',
}

export type KycInfo = {
  firstName: string;
  lastName: string;
  idNumber?: string;
  idType?: IdType;
  dateOfBirth: DateOfBirth;
  address: Address;
  nationalities?: string[];
  birthCountry?: string;
  birthCity?: string;
};
