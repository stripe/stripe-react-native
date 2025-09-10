import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { Text } from 'react-native';

interface OnrampSessionCreationSectionProps {
  isCreatingSession: boolean;
  isCheckingOut: boolean;
  onrampSessionId: string | null;
  handleCreateOnrampSession: () => void;
  handlePerformCheckout: () => void;
  validateOnrampSessionParams: () => { isValid: boolean; message?: string };
}

export function OnrampSessionCreationSection({
  isCreatingSession,
  isCheckingOut,
  onrampSessionId,
  handleCreateOnrampSession,
  handlePerformCheckout,
  validateOnrampSessionParams,
}: OnrampSessionCreationSectionProps) {
  const validation = validateOnrampSessionParams();
  return (
    <Collapse title="Onramp Session Creation" initialExpanded={true}>
      <Button
        title={
          isCreatingSession ? 'Creating Session...' : 'Create Onramp Session'
        }
        onPress={handleCreateOnrampSession}
        variant="primary"
        disabled={!validation.isValid || isCreatingSession}
      />
      {!validation.isValid && !isCreatingSession && (
        <Text style={{ marginTop: 8, color: 'red' }}>{validation.message}</Text>
      )}
      {isCreatingSession && (
        <Text style={{ marginTop: 8 }}>Creating onramp session...</Text>
      )}
      <Button
        title={isCheckingOut ? 'Checking Out...' : 'Check Out'}
        onPress={handlePerformCheckout}
        variant="primary"
        disabled={!onrampSessionId || isCheckingOut}
      />
      {!onrampSessionId && !isCheckingOut && (
        <Text style={{ marginTop: 8 }}>
          Please create an onramp session first
        </Text>
      )}
      {isCheckingOut && (
        <Text style={{ marginTop: 8 }}>Processing checkout...</Text>
      )}
    </Collapse>
  );
}
