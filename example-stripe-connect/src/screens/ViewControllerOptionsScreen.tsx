import React, { useState, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import type {
  ViewControllerSettings,
  ViewControllerPresentationType,
} from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Separator } from '../components/Separator';
import { SelectableRow } from '../components/SelectableRow';
import { SectionHeader } from '../components/SectionHeader';
import { Section } from '../components/Section';
import { Colors } from '../constants/colors';

const ViewControllerOptionsScreen: React.FC = () => {
  const router = useRouter();
  const { viewControllerSettings, setViewControllerSettings } = useSettings();

  const [localSettings, setLocalSettings] = useState<ViewControllerSettings>(
    viewControllerSettings
  );
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof ViewControllerSettings>(
    key: K,
    value: ViewControllerSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(
      JSON.stringify(newSettings) !== JSON.stringify(viewControllerSettings)
    );
  };

  const handleSave = useCallback(async () => {
    await setViewControllerSettings(localSettings);
    router.back();
  }, [localSettings, setViewControllerSettings, router]);

  const handleSelectPresentationType = (
    type: ViewControllerPresentationType
  ) => {
    updateSetting('presentationType', type);
  };

  const toggleEmbedInNavigationBar = () => {
    updateSetting('embedInNavigationBar', !localSettings.embedInNavigationBar);
  };

  const toggleEmbedInTabBar = () => {
    updateSetting('embedInTabBar', !localSettings.embedInTabBar);
  };

  const getNavigationBarSubtitle = () => {
    if (localSettings.presentationType === 'navigation_push') {
      return 'Disable this setting to hide the navigation bar on push';
    }
    return 'Embeds the view controller in a UINavigationController';
  };

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
        <ScrollView style={styles.scrollView}>
          {/* Show component view controller using */}
          <SectionHeader>Show component view controller using</SectionHeader>
          <Section>
            <SelectableRow
              title="Navigation push"
              subtitle="Pushes the component view controller onto the navigation stack."
              selected={localSettings.presentationType === 'navigation_push'}
              onPress={() => handleSelectPresentationType('navigation_push')}
            />
            <Separator />
            <SelectableRow
              title="Present modally"
              subtitle="Modally presents the component view controller."
              selected={localSettings.presentationType === 'present_modally'}
              onPress={() => handleSelectPresentationType('present_modally')}
            />
          </Section>

          {/* Embed component in */}
          <SectionHeader>Embed component in</SectionHeader>
          <Section>
            <SelectableRow
              title="Navigation bar"
              subtitle={getNavigationBarSubtitle()}
              selected={localSettings.embedInNavigationBar}
              onPress={toggleEmbedInNavigationBar}
              showCheckmark={false}
              showToggle={true}
            />
            <Separator />
            <SelectableRow
              title="Tab bar"
              subtitle="Embeds the view controller in a UITabBarController."
              selected={localSettings.embedInTabBar}
              onPress={toggleEmbedInTabBar}
              showCheckmark={false}
              showToggle={true}
            />
          </Section>
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
});

export default ViewControllerOptionsScreen;
