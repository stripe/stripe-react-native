import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { Platform, View } from 'react-native';
import { PlatformPayButton } from '@stripe/stripe-react-native';

interface PaymentCollectionSectionProps {
  isApplePaySupported: boolean;
  handleCollectApplePayPayment: () => void;
  handleCollectCardPayment: () => void;
  handleCollectBankAccountPayment: () => void;
}

export function PaymentCollectionSection({
  isApplePaySupported,
  handleCollectApplePayPayment,
  handleCollectCardPayment,
  handleCollectBankAccountPayment,
}: PaymentCollectionSectionProps) {
  return (
    <Collapse title="Payment Collection" initialExpanded={true}>
      {Platform.OS === 'ios' && isApplePaySupported && (
        <View style={{ marginBottom: 12 }}>
          <PlatformPayButton
            onPress={handleCollectApplePayPayment}
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
    </Collapse>
  );
}
