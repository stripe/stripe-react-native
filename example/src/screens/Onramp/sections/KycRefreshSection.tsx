import React from 'react';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import type { Address } from '@stripe/stripe-react-native';

type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

interface KycRefreshSectionProps {
  needsAddressUpdate: boolean;
  updatedAddress: AddressForm;
  setUpdatedAddress: React.Dispatch<React.SetStateAction<AddressForm>>;
  onVerifyKyc: (addr: Address | null) => void;
}

export function KycRefreshSection({
  needsAddressUpdate,
  updatedAddress,
  setUpdatedAddress,
  onVerifyKyc,
}: KycRefreshSectionProps) {
  const onPress = () => {
    if (needsAddressUpdate) {
      const addr: Address = {
        line1: updatedAddress.line1 || undefined,
        line2: updatedAddress.line2 || undefined,
        city: updatedAddress.city || undefined,
        state: updatedAddress.state || undefined,
        postalCode: updatedAddress.postalCode || undefined,
        country: updatedAddress.country || 'US',
      };
      onVerifyKyc(addr);
    } else {
      onVerifyKyc(null);
    }
  };

  return (
    <Collapse title="KYC Refresh" initialExpanded={false}>
      {needsAddressUpdate && (
        <>
          <FormField
            label="Address 1"
            value={updatedAddress.line1}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, line1: text }))
            }
            placeholder="Address 1"
          />
          <FormField
            label="Address 2"
            value={updatedAddress.line2}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, line2: text }))
            }
            placeholder="Address 2"
          />
          <FormField
            label="City"
            value={updatedAddress.city}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, city: text }))
            }
            placeholder="City"
          />
          <FormField
            label="State/Province"
            value={updatedAddress.state}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, state: text }))
            }
            placeholder="State/Province"
          />
          <FormField
            label="Postal Code"
            value={updatedAddress.postalCode}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, postalCode: text }))
            }
            placeholder="Postal Code"
          />
          <FormField
            label="Country"
            value={updatedAddress.country}
            onChangeText={(text) =>
              setUpdatedAddress((a) => ({ ...a, country: text }))
            }
            placeholder="Country"
          />
        </>
      )}
      <Button
        title={
          needsAddressUpdate
            ? 'Update Address and Verify'
            : 'Verify KYC Information'
        }
        onPress={onPress}
        variant="primary"
      />
    </Collapse>
  );
}
