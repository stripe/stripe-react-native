import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import type { AppearancePreset } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { SelectableRow } from '../components/SelectableRow';
import { Separator } from '../components/Separator';
import { SectionHeader } from '../components/SectionHeader';
import { APPEARANCE_PRESET_NAMES, LOCALE_OPTIONS } from '../constants';
import { Colors } from '../constants/colors';

const ConfigureAppearanceScreen: React.FC = () => {
  const router = useRouter();
  const { appearancePreset, setAppearancePreset, locale, setLocale } =
    useSettings();
  const [selectedPreset, setSelectedPreset] =
    useState<AppearancePreset>(appearancePreset);
  const [selectedLocale, setSelectedLocale] = useState<string>(locale);
  const [hasChanges, setHasChanges] = useState(false);

  const recomputeChanges = (preset: AppearancePreset, nextLocale: string) => {
    setHasChanges(preset !== appearancePreset || nextLocale !== locale);
  };

  const handleSelectPreset = (preset: AppearancePreset) => {
    setSelectedPreset(preset);
    recomputeChanges(preset, selectedLocale);
  };

  const handleSelectLocale = (nextLocale: string) => {
    setSelectedLocale(nextLocale);
    recomputeChanges(selectedPreset, nextLocale);
  };

  const handleSave = useCallback(async () => {
    await setAppearancePreset(selectedPreset);
    await setLocale(selectedLocale);
    router.back();
  }, [selectedPreset, selectedLocale, setAppearancePreset, setLocale, router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft:
            Platform.OS === 'ios'
              ? () => (
                  <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                  </TouchableOpacity>
                )
              : undefined,
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
        <ScrollView>
          <SectionHeader>Select a preset</SectionHeader>
          <View style={styles.section}>
            {APPEARANCE_PRESET_NAMES.map((preset, index) => (
              <View key={preset}>
                <SelectableRow
                  title={preset}
                  selected={selectedPreset === preset}
                  onPress={() => handleSelectPreset(preset)}
                />
                {index < APPEARANCE_PRESET_NAMES.length - 1 && <Separator />}
              </View>
            ))}
          </View>

          <SectionHeader>Language</SectionHeader>
          <View style={styles.section}>
            {LOCALE_OPTIONS.map((option, index) => (
              <View key={option.value}>
                <SelectableRow
                  title={option.label}
                  subtitle={option.value}
                  selected={selectedLocale === option.value}
                  onPress={() => handleSelectLocale(option.value)}
                />
                {index < LOCALE_OPTIONS.length - 1 && <Separator />}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  cancelButton: {
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
  section: {
    backgroundColor: Colors.background.primary,
  },
});

export default ConfigureAppearanceScreen;
