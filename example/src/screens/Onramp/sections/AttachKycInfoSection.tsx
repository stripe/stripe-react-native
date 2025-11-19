import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';

export interface UserInfo {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface AttachKycInfoSectionProps {
  userInfo: UserInfo;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo>>;
  handleAttachKycInfo: () => void;
}

export function AttachKycInfoSection({
  userInfo,
  setUserInfo,
  handleAttachKycInfo,
}: AttachKycInfoSectionProps) {
  return (
    <Collapse title="KYC Information" initialExpanded={true}>
      <FormField
        label="First Name"
        value={userInfo.firstName}
        onChangeText={(text) =>
          setUserInfo((u: UserInfo) => ({ ...u, firstName: text }))
        }
        placeholder="First Name"
      />
      <FormField
        label="Last Name"
        value={userInfo.lastName}
        onChangeText={(text) =>
          setUserInfo((u: UserInfo) => ({ ...u, lastName: text }))
        }
        placeholder="Last Name"
      />
      <Button
        title="Attach KYC Info"
        onPress={handleAttachKycInfo}
        variant="primary"
      />
    </Collapse>
  );
}
