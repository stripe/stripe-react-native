import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, AppearancePreset } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { SelectableRow } from '../components/SelectableRow';
import { Separator } from '../components/Separator';
import { APPEARANCE_PRESET_NAMES } from '../constants';
import { Colors } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ConfigureAppearance'
>;

const ConfigureAppearanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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
    navigation.goBack();
  }, [selectedPreset, setAppearancePreset, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
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
    });
  }, [navigation, hasChanges, handleSave]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Select a preset</Text>
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
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    backgroundColor: Colors.background.primary,
  },
});

export default ConfigureAppearanceScreen;
