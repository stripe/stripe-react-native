import React, { useState, useLayoutEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, OnboardingSettings } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Separator } from '../components/Separator';
import { ChevronRight } from '../components/ChevronRight';
import { DropdownMenu, type DropdownOption } from '../components/DropdownModal';
import {
  booleanToString,
  stringToBoolean,
  formatBooleanDisplay,
} from '../utils/booleans';
import { Colors } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingSettings'
>;

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
  const navigation = useNavigation<NavigationProp>();
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

  const handleSave = useCallback(async () => {
    await setOnboardingSettings(localSettings);
    navigation.goBack();
  }, [localSettings, setOnboardingSettings, navigation]);

  const handleReset = useCallback(async () => {
    await resetOnboardingSettings();
    setLocalSettings(onboardingSettings);
    setHasChanges(false);
  }, [resetOnboardingSettings, onboardingSettings]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackButtonDisplayMode: 'minimal',
      headerLeft: undefined, // Use system default back button
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
    });
  }, [navigation, hasChanges, handleSave]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          bottomOffset={20}
          extraKeyboardSpace={20}
        >
          {/* URL Fields */}
          <View style={styles.section}>
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
                onChangeText={(text) => updateSetting('privacyPolicyUrl', text)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>

          {/* Boolean Options */}
          <View style={styles.section}>
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
                      {formatBooleanForDisplay(localSettings.fieldOption)}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={BOOLEAN_OPTIONS}
              selectedValue={booleanToDropdownValue(localSettings.fieldOption)}
              onSelect={(value) =>
                updateSetting('fieldOption', dropdownValueToBoolean(value))
              }
            />

            <Separator />

            <DropdownMenu
              trigger={
                <View style={styles.dropdownOption}>
                  <Text style={styles.dropdownLabel}>Future requirements</Text>
                  <View style={styles.dropdownValue}>
                    <Text style={styles.dropdownValueText}>
                      {formatBooleanForDisplay(
                        localSettings.futureRequirements
                      )}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={BOOLEAN_OPTIONS}
              selectedValue={booleanToDropdownValue(
                localSettings.futureRequirements
              )}
              onSelect={(value) =>
                updateSetting(
                  'futureRequirements',
                  dropdownValueToBoolean(value)
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
                      {formatBooleanForDisplay(localSettings.requirements)}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={BOOLEAN_OPTIONS}
              selectedValue={booleanToDropdownValue(localSettings.requirements)}
              onSelect={(value) =>
                updateSetting('requirements', dropdownValueToBoolean(value))
              }
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to defaults</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
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
  section: {
    marginTop: 20,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border.default,
  },
  inputGroup: {
    padding: 16,
  },
  label: {
    fontSize: 17,
    marginBottom: 8,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    color: Colors.text.primary,
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
