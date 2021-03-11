import type { CardFieldInput } from './components/CardFieldInput';

export declare namespace PaymentPass {
  export interface PresentParams extends PresentParamsIOS {
    name: string;
  }

  export interface PresentResult {
    cardTokenId?: string;
    apiVersion?: string;
  }

  interface PresentParamsIOS {
    description?: string;
    last4?: string;
    brand?: CardFieldInput.Brand;
    testMode?: boolean;
  }
}
