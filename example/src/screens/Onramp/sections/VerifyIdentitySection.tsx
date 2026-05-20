import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { colors } from '../../../colors';

interface VerifyIdentitySectionProps {
  handleVerifyIdentity: () => void;
  handlePresentCRSCARFDeclaration: () => void;
  crsCarfDeclarationStatus: string | null;
}

export function VerifyIdentitySection({
  handleVerifyIdentity,
  handlePresentCRSCARFDeclaration,
  crsCarfDeclarationStatus,
}: VerifyIdentitySectionProps) {
  return (
    <Collapse title="Verification" initialExpanded={false}>
      <Button
        title="Verify Identity"
        onPress={handleVerifyIdentity}
        variant="primary"
      />
      <Button
        title="Present CRS/CARF Declaration"
        onPress={handlePresentCRSCARFDeclaration}
        variant="primary"
      />
      {crsCarfDeclarationStatus ? (
        <Text style={styles.statusText}>
          {`CRS/CARF declaration status: ${crsCarfDeclarationStatus}`}
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
