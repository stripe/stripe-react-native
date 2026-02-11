import React from 'react';
import { View, Text, Image } from 'react-native';

interface PaymentOption {
  label: string;
  image?: string;
}

interface SelectedPaymentOptionProps {
  paymentOption?: PaymentOption | null;
}

export default function SelectedPaymentOption({
  paymentOption,
}: SelectedPaymentOptionProps) {
  return (
    <View
      style={{
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginVertical: 8,
        backgroundColor: paymentOption ? '#f0f9ff' : '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: paymentOption ? '#0ea5e9' : '#e5e5e5',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: '#666',
          marginBottom: 4,
          fontWeight: '500',
        }}
      >
        SELECTED PAYMENT METHOD
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {paymentOption?.image ? (
          <Image
            source={{ uri: `data:image/png;base64,${paymentOption.image}` }}
            style={{ width: 40, height: 26 }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 26,
              backgroundColor: '#ddd',
              borderRadius: 4,
            }}
          />
        )}
        <Text style={{ fontSize: 16, fontWeight: '600' }}>
          {paymentOption?.label ?? 'No payment method selected'}
        </Text>
      </View>
    </View>
  );
}
