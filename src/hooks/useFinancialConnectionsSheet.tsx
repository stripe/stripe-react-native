import { useState, useCallback } from 'react';
import { useStripe } from './useStripe';

/**
 * React hook for accessing functions on the Financial Connections sheet.
 *
 * Retuns the `collectBankAccountToken` and `collectFinancialConnectionsAccounts` functions, and a `loading` boolean that you can use
 * to display loading state (like showing a spinner).
 */
export function useFinancialConnectionsSheet() {
  const [loading, setLoading] = useState(false);
  const { collectBankAccountToken, collectFinancialConnectionsAccounts } =
    useStripe();

  const _collectBankAccountToken = useCallback(
    async (clientSecret: string) => {
      setLoading(true);
      const result = await collectBankAccountToken(clientSecret);
      setLoading(false);
      return result;
    },
    [collectBankAccountToken]
  );

  const _collectFinancialConnectionsAccounts = useCallback(
    async (clientSecret: string) => {
      setLoading(true);
      const result = await collectFinancialConnectionsAccounts(clientSecret);
      setLoading(false);
      return result;
    },
    [collectFinancialConnectionsAccounts]
  );

  return {
    collectBankAccountToken: _collectBankAccountToken,
    collectFinancialConnectionsAccounts: _collectFinancialConnectionsAccounts,
    loading,
  };
}
