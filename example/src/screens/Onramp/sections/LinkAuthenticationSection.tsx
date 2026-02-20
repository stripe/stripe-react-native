import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';

interface LinkAuthenticationSectionProps {
  handlePresentVerification: () => void;
}

export function LinkAuthenticationSection({
  handlePresentVerification,
}: LinkAuthenticationSectionProps) {
  return (
    <Collapse title="Link Authentication" initialExpanded={true}>
      <Button
        title="Create Auth Intent & Authenticate"
        onPress={handlePresentVerification}
        variant="primary"
      />
    </Collapse>
  );
}
