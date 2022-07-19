import { useState } from 'react';
import { useStripe } from './useStripe';

/**
 * React hook for accessing functions on the Financial Connections sheet.
 *
 * Retuns the `collectBankAccountToken` function, and a `loading` boolean that you can use
 * to display loading state (like showing a spinner).
 */
export function useFinancialConnectionsSheet() {
  const [loading, setLoading] = useState(false);
  const { collectBankAccountToken } = useStripe();

  const _collectBankAccountToken = async (clientSecret: string) => {
    setLoading(true);
    const result = await collectBankAccountToken(clientSecret);
    setLoading(false);
    return result;
  };

  return {
    collectBankAccountToken: _collectBankAccountToken,
    loading,
  };
}
