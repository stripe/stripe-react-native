import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import type { PaymentOptionData } from '@stripe/stripe-react-native';
import { colors } from '../../../colors';

type Props = {
  response: string | null;
  customerId: string | null;
  paymentDisplayData: PaymentOptionData | null;
  cryptoPaymentToken: string | null;
  authToken: string | null;
  walletAddress: string | null;
  walletNetwork: string | null;
  onrampSessionId: string | null;
};

export function OnrampResponseStatusSection({
  response,
  customerId,
  paymentDisplayData,
  cryptoPaymentToken,
  authToken,
  walletAddress,
  walletNetwork,
  onrampSessionId,
}: Props) {
  return (
    <>
      {response && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText}>{response}</Text>
        </View>
      )}

      {customerId && (
        <View style={styles.buttonContainer}>
          <Text
            style={styles.responseText}
          >{`Customer ID: ${customerId}`}</Text>
        </View>
      )}

      {paymentDisplayData && (
        <View style={styles.buttonContainer}>
          <Image
            source={{ uri: paymentDisplayData.icon }}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text
            style={styles.responseText}
          >{`Payment Method Label: ${paymentDisplayData.label}`}</Text>
          <Text
            style={styles.responseText}
          >{`Payment Method Sublabel: ${paymentDisplayData.sublabel}`}</Text>
        </View>
      )}

      {cryptoPaymentToken && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {`Crypto Payment Token: ${cryptoPaymentToken}`}
          </Text>
        </View>
      )}

      {authToken && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {`Auth Token: ${authToken.substring(0, 20)}...`}
          </Text>
        </View>
      )}

      {walletAddress && walletNetwork && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {`Wallet Address: ${walletAddress}`}
          </Text>
          <Text style={styles.responseText}>{`Network: ${walletNetwork}`}</Text>
        </View>
      )}

      {onrampSessionId && (
        <View style={styles.buttonContainer}>
          <Text style={styles.responseText} selectable>
            {`Onramp Session ID: ${onrampSessionId}`}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  responseText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.dark_gray,
  },
});
