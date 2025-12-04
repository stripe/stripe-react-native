import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import type { UserInfo } from './AttachKycInfoSection';

interface PhoneNumberUpdateSectionProps {
  userInfo: UserInfo;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo>>;
  handleUpdatePhoneNumber: () => void;
}

export function PhoneNumberUpdateSection({
  userInfo,
  setUserInfo,
  handleUpdatePhoneNumber,
}: PhoneNumberUpdateSectionProps) {
  return (
    <Collapse title="Phone Number Update" initialExpanded={true}>
      <FormField
        label="Phone Number"
        value={userInfo.phoneNumber}
        onChangeText={(text) =>
          setUserInfo((u) => ({ ...u, phoneNumber: text }))
        }
        placeholder="Phone Number (E.164 format, e.g., +12125551234)"
      />
      <Button
        title="Update Phone Number"
        onPress={handleUpdatePhoneNumber}
        variant="primary"
      />
    </Collapse>
  );
}
