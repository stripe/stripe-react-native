import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';

interface LinkAuthenticationSectionProps {
  linkAuthIntentId: string;
  setLinkAuthIntentId: (id: string) => void;
  handlePresentVerification: () => void;
  handleAuthorizeLinkAuthIntent: () => void;
}

export function LinkAuthenticationSection({
  linkAuthIntentId,
  setLinkAuthIntentId,
  handlePresentVerification,
  handleAuthorizeLinkAuthIntent,
}: LinkAuthenticationSectionProps) {
  return (
    <Collapse title="Link Authentication" initialExpanded={true}>
      <FormField
        label="Link Auth Intent ID"
        value={linkAuthIntentId}
        onChangeText={setLinkAuthIntentId}
        placeholder="Link auth intent id"
      />
      <Button
        title="Create Auth Intent & Authenticate"
        onPress={handlePresentVerification}
        variant="primary"
      />
      <Button
        title="Authorize Link Auth Intent"
        onPress={handleAuthorizeLinkAuthIntent}
        variant="primary"
      />
    </Collapse>
  );
}
