import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Onramp } from '@stripe/stripe-react-native';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { colors } from '../../../colors';
import { FormField } from '../FormField';

interface WalletOwnershipSectionProps {
  challenge: Onramp.WalletOwnershipChallenge | null;
  verifiedOwnership: boolean | null;
  canGetChallenge: boolean;
  isGettingChallenge: boolean;
  isSubmittingSignature: boolean;
  onGetChallenge: () => void;
  onSubmitSignature: (signature: string) => void;
}

export function WalletOwnershipSection({
  challenge,
  verifiedOwnership,
  canGetChallenge,
  isGettingChallenge,
  isSubmittingSignature,
  onGetChallenge,
  onSubmitSignature,
}: WalletOwnershipSectionProps) {
  const [signature, setSignature] = React.useState('abcd');

  return (
    <Collapse title="Wallet Ownership" initialExpanded={true}>
      <Button
        title={
          isGettingChallenge
            ? 'Getting Wallet Ownership Challenge...'
            : 'Get Wallet Ownership Challenge'
        }
        onPress={onGetChallenge}
        variant="primary"
        disabled={!canGetChallenge || isGettingChallenge}
        loading={isGettingChallenge}
        accessibilityLabel="Get Wallet Ownership Challenge"
      />

      {challenge ? (
        <>
          <Text style={styles.responseText} selectable>
            {`Challenge ID: ${challenge.challengeId}`}
          </Text>
          <Text style={styles.responseText} selectable>
            {`Challenge expires at: ${challenge.expiresAt}`}
          </Text>
          <Text style={styles.responseText} selectable>
            {`Challenge message:\n${challenge.message}`}
          </Text>
        </>
      ) : null}

      {verifiedOwnership !== null ? (
        <Text style={styles.verificationText}>
          {`Verified ownership: ${verifiedOwnership}`}
        </Text>
      ) : null}

      <FormField
        label="Wallet Ownership Signature"
        value={signature}
        onChangeText={setSignature}
        placeholder="Signature"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.signatureField}
      />
      <Button
        title={
          isSubmittingSignature
            ? 'Submitting Wallet Ownership Signature...'
            : 'Submit Wallet Ownership Signature'
        }
        onPress={() => onSubmitSignature(signature)}
        variant="primary"
        disabled={!challenge || !signature.trim() || isSubmittingSignature}
        loading={isSubmittingSignature}
        accessibilityLabel="Submit Wallet Ownership Signature"
      />
    </Collapse>
  );
}

const styles = StyleSheet.create({
  responseText: {
    color: colors.dark_gray,
    fontSize: 12,
    marginTop: 12,
    marginRight: 16,
  },
  verificationText: {
    color: colors.dark_gray,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginRight: 16,
  },
  signatureField: {
    marginTop: 16,
  },
});
