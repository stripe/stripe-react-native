import { useState } from 'react';
import { useStripe } from './useStripe';

/**
 * TODO
 */
export function useFinancialConnectionsSheet() {
  const [loading, setLoading] = useState(false);
  const { presentFinancialConnectionsSheet } = useStripe();

  const _presentFinancialConnectionsSheet = async (
    clientSecret: string,
    _params: {} = {}
  ) => {
    setLoading(true);
    const result = await presentFinancialConnectionsSheet(
      clientSecret,
      _params
    );
    setLoading(false);
    return result;
  };

  return {
    presentFinancialConnectionsSheet: _presentFinancialConnectionsSheet,
    loading,
  };
}
