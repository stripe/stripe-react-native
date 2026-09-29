import type { Onramp } from '@stripe/stripe-react-native';
import type { SourceCurrency } from './sections/PaymentCollectionSection';

export type KycResidence = 'US' | 'EU' | 'CA' | 'CO' | 'PH';

interface KycResidenceConfiguration {
  label: string;
  countryCode: string;
  sourceCurrency: SourceCurrency;
  nationalId: {
    type: Onramp.IdType;
    label: string;
    placeholder: string;
  } | null;
}

export const kycResidences: Record<KycResidence, KycResidenceConfiguration> = {
  US: {
    label: 'United States',
    countryCode: 'US',
    sourceCurrency: 'usd',
    nationalId: {
      type: 'social_security_number',
      label: 'Social Security Number (SSN)',
      placeholder: '000000000',
    },
  },
  EU: {
    label: 'European Union',
    countryCode: '',
    sourceCurrency: 'eur',
    nationalId: null,
  },
  CA: {
    label: 'Canada',
    countryCode: 'CA',
    sourceCurrency: 'cad',
    nationalId: {
      type: 'ca_sin',
      label: 'Social Insurance Number (SIN)',
      placeholder: '000000000',
    },
  },
  CO: {
    label: 'Colombia',
    countryCode: 'CO',
    sourceCurrency: 'cop',
    nationalId: {
      type: 'co_nit',
      label: 'Número de Identificación Tributaria (NIT)',
      placeholder: '0000000000',
    },
  },
  PH: {
    label: 'Philippines',
    countryCode: 'PH',
    sourceCurrency: 'php',
    nationalId: {
      type: 'ph_tin',
      label: 'Taxpayer Identification Number (TIN)',
      placeholder: '000000000000',
    },
  },
};
