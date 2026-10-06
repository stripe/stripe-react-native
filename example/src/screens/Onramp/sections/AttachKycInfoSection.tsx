import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import { colors } from '../../../colors';
import { kycResidences } from '../KycResidence';
import type { KycResidence } from '../KycResidence';

export interface KycInfoInput {
  residence: KycResidence;
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirthDay: string;
  dateOfBirthMonth: string;
  dateOfBirthYear: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  birthCountry: string;
  birthCity: string;
  nationalities: string;
}

interface AttachKycInfoSectionProps {
  kycInfo: KycInfoInput;
  setKycInfo: React.Dispatch<React.SetStateAction<KycInfoInput>>;
  onResidenceChange: (residence: KycResidence) => void;
  handleAttachKycInfo: () => void;
}

export function AttachKycInfoSection({
  kycInfo,
  setKycInfo,
  onResidenceChange,
  handleAttachKycInfo,
}: AttachKycInfoSectionProps) {
  const residence = kycResidences[kycInfo.residence];
  const isEuResidence = kycInfo.residence === 'EU';
  const updateField =
    (field: keyof KycInfoInput) =>
    (text: string): void => {
      setKycInfo((current) => ({ ...current, [field]: text }));
    };

  return (
    <Collapse title="KYC Information" initialExpanded={false}>
      <Text style={styles.note}>
        Select a residence, then enter any KYC details you want to attach. Birth
        country, birth city, and nationalities are used by the newer EU
        compliance flows.
      </Text>
      <Text style={styles.groupLabel}>Residence</Text>
      <Picker<KycResidence>
        accessibilityLabel="Residence"
        selectedValue={kycInfo.residence}
        onValueChange={onResidenceChange}
        style={styles.residencePicker}
      >
        {Object.entries(kycResidences).map(([value, configuration]) => (
          <Picker.Item key={value} label={configuration.label} value={value} />
        ))}
      </Picker>
      <FormField
        label="First Name"
        value={kycInfo.firstName}
        onChangeText={updateField('firstName')}
        placeholder="Jane"
        autoCapitalize="words"
      />
      <FormField
        label="Last Name"
        value={kycInfo.lastName}
        onChangeText={updateField('lastName')}
        placeholder="Doe"
        autoCapitalize="words"
      />
      {residence.nationalId && (
        <FormField
          label={residence.nationalId.label}
          value={kycInfo.idNumber}
          onChangeText={updateField('idNumber')}
          placeholder={residence.nationalId.placeholder}
          keyboardType="ascii-capable"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
      <Text style={styles.groupLabel}>Date of Birth</Text>
      <View style={styles.dateOfBirthRow}>
        <FormField
          label="Day"
          value={kycInfo.dateOfBirthDay}
          onChangeText={updateField('dateOfBirthDay')}
          placeholder="15"
          keyboardType="number-pad"
          containerStyle={styles.dateField}
        />
        <FormField
          label="Month"
          value={kycInfo.dateOfBirthMonth}
          onChangeText={updateField('dateOfBirthMonth')}
          placeholder="6"
          keyboardType="number-pad"
          containerStyle={styles.dateField}
        />
        <FormField
          label="Year"
          value={kycInfo.dateOfBirthYear}
          onChangeText={updateField('dateOfBirthYear')}
          placeholder="1990"
          keyboardType="number-pad"
          containerStyle={styles.dateField}
        />
      </View>
      <FormField
        label="Address Line 1"
        value={kycInfo.addressLine1}
        onChangeText={updateField('addressLine1')}
        placeholder="123 Main St"
        autoCapitalize="words"
      />
      <FormField
        label="Address Line 2"
        value={kycInfo.addressLine2}
        onChangeText={updateField('addressLine2')}
        placeholder="Apt 4B"
        autoCapitalize="words"
      />
      <FormField
        label="City"
        value={kycInfo.addressCity}
        onChangeText={updateField('addressCity')}
        placeholder="San Francisco"
        autoCapitalize="words"
      />
      <FormField
        label={isEuResidence ? 'State / Province' : 'State / Province *'}
        value={kycInfo.addressState}
        onChangeText={updateField('addressState')}
        placeholder="CA"
        autoCapitalize="characters"
      />
      <FormField
        label="Postal Code"
        value={kycInfo.addressPostalCode}
        onChangeText={updateField('addressPostalCode')}
        placeholder="94111"
        autoCorrect={false}
      />
      <FormField
        label="Country"
        value={kycInfo.addressCountry}
        onChangeText={updateField('addressCountry')}
        placeholder={residence.countryCode || 'FR'}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {isEuResidence && (
        <>
          <FormField
            label="Birth Country"
            value={kycInfo.birthCountry}
            onChangeText={updateField('birthCountry')}
            placeholder="FR"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <FormField
            label="Birth City"
            value={kycInfo.birthCity}
            onChangeText={updateField('birthCity')}
            placeholder="Paris"
            autoCapitalize="words"
          />
          <FormField
            label="Nationalities"
            value={kycInfo.nationalities}
            onChangeText={updateField('nationalities')}
            placeholder="FR, DE"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      )}
      <Button
        title="Attach KYC Info"
        onPress={handleAttachKycInfo}
        variant="primary"
      />
    </Collapse>
  );
}

const styles = StyleSheet.create({
  note: {
    marginBottom: 12,
    color: colors.slate,
  },
  groupLabel: {
    marginBottom: 4,
    fontWeight: 'bold',
    color: colors.slate,
  },
  residencePicker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 12,
  },
  dateOfBirthRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
});
