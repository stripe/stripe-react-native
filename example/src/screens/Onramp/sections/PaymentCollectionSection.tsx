import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { PlatformPayButton } from '@stripe/stripe-react-native';
import { colors } from '../../../colors';
import { SegmentedControl } from '../../../components/SegmentedControl';

export type SourceCurrency = 'usd' | 'eur';

interface PaymentCollectionSectionProps {
  isPlatformPaySupported: boolean;
  isSamsungPaySupported: boolean;
  sourceCurrency: SourceCurrency;
  onSourceCurrencyChange: (currency: SourceCurrency) => void;
  handleCollectPlatformPayPayment: () => void;
  handleCollectSamsungPayPayment: () => void;
  handleCollectCardPayment: () => void;
  handleCollectBankAccountPayment: () => void;
  handleCollectCardAndBankAccountPayment: () => void;
}

export function PaymentCollectionSection({
  isPlatformPaySupported,
  isSamsungPaySupported,
  sourceCurrency,
  onSourceCurrencyChange,
  handleCollectPlatformPayPayment,
  handleCollectSamsungPayPayment,
  handleCollectCardPayment,
  handleCollectBankAccountPayment,
  handleCollectCardAndBankAccountPayment,
}: PaymentCollectionSectionProps) {
  return (
    <Collapse title="Payment Collection" initialExpanded={true}>
      <Text style={styles.sourceCurrencyLabel}>Source Currency</Text>
      <View style={styles.sourceCurrencyOptions}>
        <SegmentedControl<SourceCurrency>
          options={[
            { value: 'usd', label: '$ USD' },
            { value: 'eur', label: '€ EUR' },
          ]}
          value={sourceCurrency}
          onValueChange={onSourceCurrencyChange}
        />
      </View>
      {isPlatformPaySupported && (
        <View style={{ marginBottom: 12 }}>
          <PlatformPayButton
            onPress={handleCollectPlatformPayPayment}
            style={{ width: '100%', height: 44 }}
          />
        </View>
      )}
      {Platform.OS === 'android' && (
        <View style={styles.samsungPayContainer}>
          <Button
            title="Pay with Samsung Pay"
            onPress={handleCollectSamsungPayPayment}
            variant="primary"
            disabled={!isSamsungPaySupported}
            accessibilityLabel="Pay with Samsung Pay"
          />
          {!isSamsungPaySupported && (
            <Text style={styles.walletUnavailableText}>
              Samsung Pay requires a supported Samsung device, a configured
              service ID, and Samsung Pay SDK 2.22.00.
            </Text>
          )}
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

const styles = StyleSheet.create({
  sourceCurrencyLabel: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  sourceCurrencyOptions: {
    marginBottom: 12,
  },
  samsungPayContainer: {
    marginBottom: 8,
  },
  walletUnavailableText: {
    color: colors.slate,
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
});
