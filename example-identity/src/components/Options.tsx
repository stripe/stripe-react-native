import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AllowedTypes,
  PhoneOtpCheckTypes,
  VerificationSessionOptions,
  VerificationType,
} from '../types';
import { Option } from './Option';
import { useAppThemeColors } from '../utils/theme';

type OptionsProps = {
  options: VerificationSessionOptions;
  setOptions(options: VerificationSessionOptions): void;
};

const verificationTypes = [
  { value: VerificationType.DOCUMENT, label: 'Document' },
  { value: VerificationType.ID_NUMBER, label: 'ID Number' },
  { value: VerificationType.ADDRESS, label: 'Address' },
  { value: VerificationType.PHONE, label: 'Phone' },
];

const documentTypes = [
  { value: AllowedTypes.DRIVING_LICENSE, label: 'Driving License' },
  { value: AllowedTypes.PASSPORT, label: 'Passport' },
  { value: AllowedTypes.ID_CARD, label: 'ID Card' },
];

function Choices<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange(value: T): void;
}) {
  const colors = useAppThemeColors();

  return (
    <View style={styles.choices}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.choiceRow}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: choice.value === value }}
            onPress={() => onChange(choice.value)}
            style={[
              styles.choice,
              {
                backgroundColor: colors.card,
                borderColor:
                  choice.value === value ? colors.text : colors.separator,
              },
            ]}
          >
            <Text style={{ color: colors.text }}>{choice.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Options({ options, setOptions }: OptionsProps) {
  const colors = useAppThemeColors();
  const showDocumentOptions =
    options.verificationType === VerificationType.DOCUMENT ||
    (options.verificationType === VerificationType.PHONE &&
      options.phoneFallbackToDocument);

  return (
    <View style={styles.container}>
      <Option
        testID="use-test-mode"
        title="Use Test Mode"
        value={options.useTestMode}
        onChange={(value) => setOptions({ ...options, useTestMode: value })}
      />
      <Choices
        label="Verification Type:"
        choices={verificationTypes}
        value={options.verificationType}
        onChange={(value) =>
          setOptions({ ...options, verificationType: value })
        }
      />
      {options.verificationType === VerificationType.PHONE && (
        <>
          <Option
            title="Fallback to document"
            value={options.phoneFallbackToDocument}
            onChange={(value) =>
              setOptions({ ...options, phoneFallbackToDocument: value })
            }
          />
          {options.phoneFallbackToDocument && (
            <Choices
              label="OTP Check:"
              choices={Object.values(PhoneOtpCheckTypes).map((value) => ({
                value,
                label: value,
              }))}
              value={options.phoneOtpCheckType}
              onChange={(value) =>
                setOptions({ ...options, phoneOtpCheckType: value })
              }
            />
          )}
        </>
      )}
      {showDocumentOptions && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>
            Allowed Types:
          </Text>
          <View style={styles.section}>
            {documentTypes.map(({ value: type, label }) => (
              <Option
                key={type}
                title={label}
                value={options.allowedTypes[type]}
                onChange={(value) =>
                  setOptions({
                    ...options,
                    allowedTypes: { ...options.allowedTypes, [type]: value },
                  })
                }
              />
            ))}
          </View>
          <Option
            title="Require ID Number"
            value={options.requireIdNumber}
            onChange={(value) =>
              setOptions({ ...options, requireIdNumber: value })
            }
          />
          <Option
            title="Require Address"
            value={options.requireAddress}
            onChange={(value) =>
              setOptions({ ...options, requireAddress: value })
            }
          />
          <Option
            title="Require Live Capture"
            value={options.requireLiveCapture}
            onChange={(value) =>
              setOptions({ ...options, requireLiveCapture: value })
            }
          />
          <Option
            title="Require Matching Selfie"
            value={options.requireMatchingSelfie}
            onChange={(value) =>
              setOptions({ ...options, requireMatchingSelfie: value })
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  section: {
    marginLeft: 10,
  },
  choices: {
    marginBottom: 16,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
});
