import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';

interface KycRefreshSectionProps {
  handlePresentKycVerification: () => void;
}

export function KycRefreshSection({
  handlePresentKycVerification,
}: KycRefreshSectionProps) {
  return (
    <Collapse title="KYC Refresh" initialExpanded={false}>
      <Button
        title="Verify KYC Information"
        onPress={handlePresentKycVerification}
        variant="primary"
      />
    </Collapse>
  );
}
