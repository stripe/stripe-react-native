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
import { APPEARANCE_PRESET_NAMES } from '../constants';
import { Colors } from '../constants/colors';

const ConfigureAppearanceScreen: React.FC = () => {
  const router = useRouter();
  const { appearancePreset, setAppearancePreset } = useSettings();
  const [selectedPreset, setSelectedPreset] =
    useState<AppearancePreset>(appearancePreset);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSelectPreset = (preset: AppearancePreset) => {
    setSelectedPreset(preset);
    setHasChanges(preset !== appearancePreset);
  };

  const handleSave = useCallback(async () => {
    await setAppearancePreset(selectedPreset);
    router.back();
  }, [selectedPreset, setAppearancePreset, router]);

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
        <View style={styles.section}>
          <SectionHeader>Select a preset</SectionHeader>
          <ScrollView style={styles.scrollView}>
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
          </ScrollView>
        </View>
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
    flex: 1,
  },
  scrollView: {
    backgroundColor: Colors.background.primary,
  },
});

export default ConfigureAppearanceScreen;
