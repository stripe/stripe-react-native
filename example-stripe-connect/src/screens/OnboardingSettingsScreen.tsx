import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, Stack } from 'expo-router';
import type {
  OnboardingSettings,
  FieldOption,
  FutureRequirements,
  Requirements,
} from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Separator } from '../components/Separator';
import { ChevronRight } from '../components/ChevronRight';
import { Section } from '../components/Section';
import { DropdownMenu, type DropdownOption } from '../components/DropdownModal';
import {
  booleanToString,
  stringToBoolean,
  formatBooleanDisplay,
} from '../utils/booleans';
import {
  FIELD_OPTIONS,
  FUTURE_REQUIREMENTS_OPTIONS,
  REQUIREMENTS_OPTIONS,
} from '../constants';
import { Colors } from '../constants/colors';

const BOOLEAN_OPTIONS: DropdownOption[] = [
  { label: 'Default', value: 'default' },
  { label: 'False', value: 'false' },
  { label: 'True', value: 'true' },
];

// Helper functions to convert between boolean values and dropdown strings
const booleanToDropdownValue = (value?: boolean): string => {
  if (value === undefined) return 'default';
  return booleanToString(value);
};

const dropdownValueToBoolean = (value: string): boolean | undefined => {
  if (value === 'default') return undefined;
  return stringToBoolean(value);
};

const formatBooleanForDisplay = (value?: boolean): string => {
  if (value === undefined) return 'Default';
  return formatBooleanDisplay(value);
};

const OnboardingSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { onboardingSettings, setOnboardingSettings, resetOnboardingSettings } =
    useSettings();

  const [localSettings, setLocalSettings] =
    useState<OnboardingSettings>(onboardingSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof OnboardingSettings>(
    key: K,
    value: OnboardingSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(
      JSON.stringify(newSettings) !== JSON.stringify(onboardingSettings)
    );
  };

  // Helper functions for Field Options
  const getFieldOptionLabel = (value?: FieldOption): string => {
    if (!value) return 'Default';
    const option = FIELD_OPTIONS.find((o) => o.value === value);
    return option?.label || value;
  };

  const fieldOptionDropdownOptions: DropdownOption[] = FIELD_OPTIONS.map(
    (option) => ({
      label: option.label,
      value: option.value,
    })
  );

  // Helper functions for Future Requirements
  const getFutureRequirementsLabel = (value?: FutureRequirements): string => {
    if (!value) return 'Default';
    const option = FUTURE_REQUIREMENTS_OPTIONS.find((o) => o.value === value);
    return option?.label || value;
  };

  const futureRequirementsDropdownOptions: DropdownOption[] =
    FUTURE_REQUIREMENTS_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
    }));

  // Helper functions for Requirements
  const getRequirementsLabel = (value?: Requirements): string => {
    if (!value) return 'Default';
    const option = REQUIREMENTS_OPTIONS.find((o) => o.value === value);
    return option?.label || value;
  };

  const requirementsDropdownOptions: DropdownOption[] =
    REQUIREMENTS_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
    }));

  const handleSave = useCallback(async () => {
    await setOnboardingSettings(localSettings);
    router.back();
  }, [localSettings, setOnboardingSettings, router]);

  const handleReset = useCallback(async () => {
    await resetOnboardingSettings();
    setLocalSettings(onboardingSettings);
    setHasChanges(false);
  }, [resetOnboardingSettings, onboardingSettings]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: undefined,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={!hasChanges}>
              <Text
                style={[
                  styles.saveButton,
                  !hasChanges && styles.saveButtonDisabled,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView
            style={styles.scrollView}
            bottomOffset={20}
            extraKeyboardSpace={20}
          >
            {/* URL Fields */}
            <View style={styles.sectionWrapper}>
              <Section>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full terms of service</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com"
                    placeholderTextColor={Colors.text.secondary}
                    value={localSettings.fullTermsOfServiceUrl}
                    onChangeText={(text) =>
                      updateSetting('fullTermsOfServiceUrl', text)
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Recipient terms of service</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com"
                    placeholderTextColor={Colors.text.secondary}
                    value={localSettings.recipientTermsOfServiceUrl}
                    onChangeText={(text) =>
                      updateSetting('recipientTermsOfServiceUrl', text)
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Privacy policy</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com"
                    placeholderTextColor={Colors.text.secondary}
                    value={localSettings.privacyPolicyUrl}
                    onChangeText={(text) =>
                      updateSetting('privacyPolicyUrl', text)
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </Section>
            </View>

            {/* Boolean Options */}
            <View style={styles.sectionWrapper}>
              <Section>
                <DropdownMenu
                  trigger={
                    <View style={styles.dropdownOption}>
                      <Text style={styles.dropdownLabel}>
                        Skip terms of service
                      </Text>
                      <View style={styles.dropdownValue}>
                        <Text style={styles.dropdownValueText}>
                          {formatBooleanForDisplay(
                            localSettings.skipTermsOfService
                          )}
                        </Text>
                        <ChevronRight />
                      </View>
                    </View>
                  }
                  options={BOOLEAN_OPTIONS}
                  selectedValue={booleanToDropdownValue(
                    localSettings.skipTermsOfService
                  )}
                  onSelect={(value) =>
                    updateSetting(
                      'skipTermsOfService',
                      dropdownValueToBoolean(value)
                    )
                  }
                />

                <Separator />

                <DropdownMenu
                  trigger={
                    <View style={styles.dropdownOption}>
                      <Text style={styles.dropdownLabel}>Field option</Text>
                      <View style={styles.dropdownValue}>
                        <Text style={styles.dropdownValueText}>
                          {getFieldOptionLabel(localSettings.fieldOption)}
                        </Text>
                        <ChevronRight />
                      </View>
                    </View>
                  }
                  options={fieldOptionDropdownOptions}
                  selectedValue={localSettings.fieldOption || 'default'}
                  onSelect={(value) =>
                    updateSetting(
                      'fieldOption',
                      value === 'default' ? undefined : (value as FieldOption)
                    )
                  }
                />

                <Separator />

                <DropdownMenu
                  trigger={
                    <View style={styles.dropdownOption}>
                      <Text style={styles.dropdownLabel}>
                        Future requirements
                      </Text>
                      <View style={styles.dropdownValue}>
                        <Text style={styles.dropdownValueText}>
                          {getFutureRequirementsLabel(
                            localSettings.futureRequirements
                          )}
                        </Text>
                        <ChevronRight />
                      </View>
                    </View>
                  }
                  options={futureRequirementsDropdownOptions}
                  selectedValue={localSettings.futureRequirements || 'default'}
                  onSelect={(value) =>
                    updateSetting(
                      'futureRequirements',
                      value === 'default'
                        ? undefined
                        : (value as FutureRequirements)
                    )
                  }
                />

                <Separator />

                <DropdownMenu
                  trigger={
                    <View style={styles.dropdownOption}>
                      <Text style={styles.dropdownLabel}>Requirements</Text>
                      <View style={styles.dropdownValue}>
                        <Text style={styles.dropdownValueText}>
                          {getRequirementsLabel(localSettings.requirements)}
                        </Text>
                        <ChevronRight />
                      </View>
                    </View>
                  }
                  options={requirementsDropdownOptions}
                  selectedValue={localSettings.requirements || 'default'}
                  onSelect={(value) =>
                    updateSetting(
                      'requirements',
                      value === 'default' ? undefined : (value as Requirements)
                    )
                  }
                />
              </Section>
            </View>

            {/* Requirements List - shown when requirements is set */}
            {localSettings.requirements !== undefined && (
              <View style={styles.sectionWrapper}>
                <Section>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Requirements List</Text>
                    <Text style={styles.helperText}>
                      Enter one requirement per line
                    </Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      placeholder=""
                      placeholderTextColor={Colors.text.secondary}
                      value={localSettings.requirementsList}
                      onChangeText={(text) =>
                        updateSetting('requirementsList', text)
                      }
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </Section>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset to defaults</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButtonDisabled: {
    color: Colors.text.disabled,
  },
  sectionWrapper: {
    marginTop: 20,
  },
  inputGroup: {
    padding: 16,
  },
  label: {
    fontSize: 17,
    marginBottom: 8,
    color: Colors.text.primary,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 8,
    color: Colors.text.secondary,
  },
  input: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    color: Colors.text.primary,
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background.primary,
  },
  dropdownLabel: {
    fontSize: 17,
    color: Colors.text.primary,
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownValueText: {
    fontSize: 17,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  resetButton: {
    padding: 20,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 17,
    color: Colors.text.link,
  },
});

export default OnboardingSettingsScreen;
