import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  TextInput,
} from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import { useStripe } from '@stripe/stripe-react-native';
import { addListener } from '../../../src/events';
import {
  OnrampCollectPaymentResult,
  OnrampIdentityVerificationResult,
  OnrampVerificationResult,
  PaymentOptionData,
} from '../../../src/types';

export default function CryptoOnrampScreen() {
  const {
    lookupLinkUser,
    presentOnrampVerificationFlow,
    promptOnrampIdentityVerification,
    presentOnrampCollectPaymentFlow,
  } = useStripe();
  const [email, setEmail] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLinkUser, setIsLinkUser] = useState<boolean | null>(false);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [paymentMethod] = useState<string | null>('Card');
  const [paymentDisplayData, setPaymentDisplayData] =
    useState<PaymentOptionData | null>(null);

  const checkIsLinkUser = useCallback(async () => {
    setResponse(null);
    try {
      const result = await lookupLinkUser(email);
      const verified = result?.isLinkUser ?? false;
      setIsLinkUser(verified);
      setResponse(`Is Link User: ${verified}`);
    } catch (error: any) {
      setResponse(
        `Error: ${error?.message || 'An error occurred while checking link user.'}`
      );
    }
  }, [email, lookupLinkUser]);

  const handlePresentVerification = useCallback(async () => {
    try {
      await presentOnrampVerificationFlow();
    } catch (error) {
      console.error('Error presenting verification flow:', error);
      Alert.alert('Error', 'Could not present verification flow.');
    }
  }, [presentOnrampVerificationFlow]);

  const handleVerifyIdentity = useCallback(async () => {
    try {
      await promptOnrampIdentityVerification();
    } catch (error) {
      console.error('Error verifying identity:', error);
      Alert.alert('Error', 'Could not verify identity.');
    }
  }, [promptOnrampIdentityVerification]);

  const handleCollectPayment = useCallback(async () => {
    try {
      await presentOnrampCollectPaymentFlow(paymentMethod);
    } catch (error) {
      console.error('Error collecting payment:', error);
      Alert.alert('Error', 'Could not collect payment.');
    }
  }, [paymentMethod, presentOnrampCollectPaymentFlow]);

  useEffect(() => {
    const authSub = addListener(
      'onOnrampAuthentication',
      (result: OnrampVerificationResult) => {
        // Handle authentication result
        if (result.status === 'completed') {
          setCustomerId(result.customerId);
        } else if (result.status === 'cancelled') {
          Alert.alert(
            'Cancelled',
            'Authentication cancelled, please try again.'
          );
        } else if (result.status === 'failed') {
          Alert.alert('Failed', `Authentication failed: ${result.error}`);
        }
      }
    );

    const identitySub = addListener(
      'onOnrampIdentityVerification',
      (result: OnrampIdentityVerificationResult) => {
        // Handle identity verification result
        if (result.status === 'completed') {
          Alert.alert('Success', 'Identity Verification completed');
        } else if (result.status === 'cancelled') {
          Alert.alert(
            'Cancelled',
            'Identity Verification cancelled, please try again.'
          );
        } else if (result.status === 'failed') {
          Alert.alert(
            'Failed',
            `Identity Verification failed: ${result.error}`
          );
        }
      }
    );

    const paymentSub = addListener(
      'onOnrampSelectPayment',
      (result: OnrampCollectPaymentResult) => {
        // Handle payment selection result
        if (result.status === 'completed') {
          setPaymentDisplayData(result.displayData);
        } else if (result.status === 'cancelled') {
          Alert.alert(
            'Cancelled',
            'Payment selection cancelled, please try again.'
          );
        } else if (result.status === 'failed') {
          Alert.alert('Failed', `Payment selection failed: ${result.error}`);
        }
      }
    );

    // Clean up listeners on unmount
    return () => {
      authSub.remove();
      identitySub.remove();
      paymentSub.remove();
    };
  }, []);

  return (
    <ScrollView accessibilityLabel="onramp-flow" style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Enter your email address:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLinkUser}
        />

        <View style={styles.buttonContainer}>
          {response && <Text style={styles.responseText}>{response}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          {customerId && (
            <Text style={styles.responseText}>
              {'Customer ID: ' + customerId}
            </Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          {paymentDisplayData && (
            <Text style={styles.responseText}>
              {'Payment Method Label: ' + paymentDisplayData.label}
            </Text>
          )}
          {paymentDisplayData && (
            <Text style={styles.responseText}>
              {'Payment Method Sublabel: ' + paymentDisplayData.sublabel}
            </Text>
          )}
        </View>

        {isLinkUser === false && (
          <Button title="Verify Link User" onPress={checkIsLinkUser} />
        )}

        {isLinkUser === true && customerId === null && (
          <Button
            title="Authenticate Link User"
            onPress={handlePresentVerification}
          />
        )}

        {isLinkUser === true && customerId != null && (
          <Button title="Verify Identity" onPress={handleVerifyIdentity} />
        )}

        {isLinkUser === true && customerId != null && (
          <Button title="Collect Payment" onPress={handleCollectPayment} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoContainer: {
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  responseText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.dark_gray,
  },
});
