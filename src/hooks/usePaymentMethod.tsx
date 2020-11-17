import { useContext } from 'react';
import { StripeContext } from '../StripeContext';

export function usePaymentMethod() {
  const { cardDetails } = useContext(StripeContext);

  return { cardDetails };
}
