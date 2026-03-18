import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { View } from 'react-native';
import { PlatformPayButton } from '@stripe/stripe-react-native';

interface PaymentCollectionSectionProps {
  isPlatformPaySupported: boolean;
  handleCollectPlatformPayPayment: () => void;
  handleCollectCardPayment: () => void;
  handleCollectBankAccountPayment: () => void;
  handleCollectCardAndBankAccountPayment: () => void;
}

export function PaymentCollectionSection({
  isPlatformPaySupported,
  handleCollectPlatformPayPayment,
  handleCollectCardPayment,
  handleCollectBankAccountPayment,
  handleCollectCardAndBankAccountPayment,
}: PaymentCollectionSectionProps) {
  return (
    <Collapse title="Payment Collection" initialExpanded={true}>
      {isPlatformPaySupported && (
        <View style={{ marginBottom: 12 }}>
          <PlatformPayButton
            onPress={handleCollectPlatformPayPayment}
            style={{ width: '100%', height: 44 }}
          />
        </View>
      )}
      <Button
        title="Collect Card Payment"
        onPress={handleCollectCardPayment}
        variant="primary"
      />
      <Button
        title="Collect Bank Account Payment"
        onPress={handleCollectBankAccountPayment}
        variant="primary"
      />
      <Button
        title="Collect Card or Bank Account Payment"
        onPress={handleCollectCardAndBankAccountPayment}
        variant="primary"
      />
    </Collapse>
  );
}
