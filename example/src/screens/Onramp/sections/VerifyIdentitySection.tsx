import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';

interface VerifyIdentitySectionProps {
  handleVerifyIdentity: () => void;
}

export function VerifyIdentitySection({
  handleVerifyIdentity,
}: VerifyIdentitySectionProps) {
  return (
    <Collapse title="Verify Identity" initialExpanded={false}>
      <Button
        title="Verify Identity"
        onPress={handleVerifyIdentity}
        variant="primary"
      />
    </Collapse>
  );
}
