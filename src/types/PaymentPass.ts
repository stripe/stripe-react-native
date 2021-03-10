import type { CardFieldInput } from './components/CardFieldInput';

export declare namespace PaymentPass {
  export interface PresentParams {
    name: string;
    description?: string;
    last4?: string;
    brand?: CardFieldInput.Brand;
  }
}
