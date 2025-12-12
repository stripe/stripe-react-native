import { useRouter, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectableRow } from '../components/SelectableRow';
import { Separator } from '../components/Separator';
import { ChevronRight } from '../components/ChevronRight';
import { SectionHeader } from '../components/SectionHeader';
import { Section } from '../components/Section';
import { DEFAULT_BACKEND_URL } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import type { MerchantInfo } from '../types';
import { Colors } from '../constants/colors';

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const {
    selectedMerchant,
    backendUrl,
    availableMerchants,
    setSelectedMerchant,
    setBackendUrl,
  } = useSettings();

  const [localSelectedMerchant, setLocalSelectedMerchant] =
    useState<MerchantInfo | null>(selectedMerchant);
  const [localBackendUrl, setLocalBackendUrl] = useState(backendUrl);
  const [customMerchantId, setCustomMerchantId] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = useCallback(async () => {
    if (localSelectedMerchant) {
      await setSelectedMerchant(localSelectedMerchant);
    }
    await setBackendUrl(localBackendUrl);
    router.back();
  }, [
    localSelectedMerchant,
    localBackendUrl,
    setSelectedMerchant,
    setBackendUrl,
    router,
  ]);

  const handleSelectMerchant = (merchant: MerchantInfo) => {
    setLocalSelectedMerchant(merchant);
    checkForChanges(merchant, localBackendUrl);
  };

  const handleCustomMerchantChange = (text: string) => {
    setCustomMerchantId(text);
    if (text.trim()) {
      const customMerchant: MerchantInfo = {
        merchant_id: text.trim(),
        display_name: 'Other',
      };
      setLocalSelectedMerchant(customMerchant);
      checkForChanges(customMerchant, localBackendUrl);
    }
  };

  const handleBackendUrlChange = (text: string) => {
    setLocalBackendUrl(text);
    checkForChanges(localSelectedMerchant, text);
  };

  const checkForChanges = (merchant: MerchantInfo | null, url: string) => {
    const merchantChanged =
      merchant?.merchant_id !== selectedMerchant?.merchant_id;
    const urlChanged = url !== backendUrl;
    setHasChanges(merchantChanged || urlChanged);
  };

  const handleResetBackendUrl = () => {
    setLocalBackendUrl(DEFAULT_BACKEND_URL);
    checkForChanges(localSelectedMerchant, DEFAULT_BACKEND_URL);
  };

  const isMerchantSelected = (merchant: MerchantInfo): boolean => {
    return merchant.merchant_id === localSelectedMerchant?.merchant_id;
  };

  const isCustomMerchantSelected =
    localSelectedMerchant &&
    !availableMerchants.find(
      (m) => m.merchant_id === localSelectedMerchant.merchant_id
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>Cancel</Text>
            </TouchableOpacity>
          ),
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
            contentContainerStyle={styles.scrollContent}
            bottomOffset={20}
            extraKeyboardSpace={20}
          >
            {/* Select a demo account section */}
            <SectionHeader>Select a merchant</SectionHeader>
            <Section>
              {availableMerchants.map((merchant, index) => (
                <View key={merchant.merchant_id}>
                  <SelectableRow
                    title={merchant.display_name || merchant.merchant_id}
                    subtitle={merchant.merchant_id}
                    selected={isMerchantSelected(merchant)}
                    onPress={() => handleSelectMerchant(merchant)}
                  />
                  {index < availableMerchants.length - 1 && <Separator />}
                </View>
              ))}

              {/* Other / Custom Merchant */}
              <Separator />
              <View style={styles.customMerchantSection}>
                <SelectableRow
                  title="Other"
                  selected={!!isCustomMerchantSelected}
                  onPress={() => {}}
                />
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="acct_xxxx"
                    value={customMerchantId}
                    onChangeText={handleCustomMerchantChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>
            </Section>

            {/* Component Settings section */}
            <SectionHeader>Component Settings</SectionHeader>
            <Section>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => router.push('/(settings)/onboarding-settings')}
              >
                <Text style={styles.menuLabel}>Account onboarding</Text>
                <ChevronRight />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() =>
                  router.push('/(settings)/payments-filter-settings')
                }
              >
                <Text style={styles.menuLabel}>Payments</Text>
                <ChevronRight />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() =>
                  router.push('/(settings)/view-controller-options')
                }
              >
                <Text style={styles.menuLabel}>View controller options</Text>
                <ChevronRight />
              </TouchableOpacity>
            </Section>

            {/* API Server Settings section */}
            <SectionHeader>API Server Settings</SectionHeader>
            <Section>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Backend URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder={DEFAULT_BACKEND_URL}
                  value={localBackendUrl}
                  onChangeText={handleBackendUrlChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </Section>

            {/* Reset backend URL button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetBackendUrl}
            >
              <Text style={styles.resetButtonText}>Reset to default</Text>
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    fontSize: 17,
    color: Colors.text.primary,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButtonDisabled: {
    color: Colors.text.disabled,
  },
  customMerchantSection: {
    paddingBottom: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    padding: 16,
  },
  label: {
    fontSize: 17,
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    backgroundColor: Colors.background.input,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLabel: {
    fontSize: 17,
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

export default SettingsScreen;
