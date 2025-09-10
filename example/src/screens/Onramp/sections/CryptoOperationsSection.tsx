import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';

interface CryptoOperationsSectionProps {
  cardPaymentMethod: string | null;
  bankAccountPaymentMethod: string | null;
  handleCreateCryptoPaymentToken: () => void;
}

export function CryptoOperationsSection({
  cardPaymentMethod,
  bankAccountPaymentMethod,
  handleCreateCryptoPaymentToken,
}: CryptoOperationsSectionProps) {
  return (
    <Collapse title="Crypto Operations" initialExpanded={true}>
      {(cardPaymentMethod != null || bankAccountPaymentMethod != null) && (
        <Button
          title="Create Crypto Payment Token"
          onPress={handleCreateCryptoPaymentToken}
          variant="primary"
        />
      )}
    </Collapse>
  );
}
