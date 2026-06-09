import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { colors } from '../../../colors';

interface VerifyIdentitySectionProps {
  handleVerifyIdentity: () => void;
  handlePresentUserAttestation: () => void;
  userAttestationStatus: string | null;
}

export function VerifyIdentitySection({
  handleVerifyIdentity,
  handlePresentUserAttestation,
  userAttestationStatus,
}: VerifyIdentitySectionProps) {
  return (
    <Collapse title="Verification" initialExpanded={false}>
      <Button
        title="Verify Identity"
        onPress={handleVerifyIdentity}
        variant="primary"
      />
      <Button
        title="Present User Attestation"
        onPress={handlePresentUserAttestation}
        variant="primary"
      />
      {userAttestationStatus ? (
        <Text style={styles.statusText}>
          {`User attestation status: ${userAttestationStatus}`}
        </Text>
      ) : null}
    </Collapse>
  );
}

const styles = StyleSheet.create({
  statusText: {
    color: colors.dark_gray,
    fontSize: 12,
    marginTop: 12,
    marginRight: 16,
    marginBottom: 16,
  },
});
