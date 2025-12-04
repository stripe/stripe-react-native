import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import type { CollectionOptions } from '@stripe/stripe-react-native/lib/typescript/src/connect/connectTypes';
import ConnectScreen from '../src/screens/ConnectScreen';
import { useSettings } from '../src/contexts/SettingsContext';
import { Colors } from '../src/constants/colors';

export default function AccountOnboardingScreen() {
  const router = useRouter();
  const { onboardingSettings, viewControllerSettings } = useSettings();
  const [visible, setVisible] = useState(false);

  const handleOnboardingExit = useCallback(() => {
    console.log('User exited account onboarding');
    setVisible(false);
  }, []);

  const collectionOptions = useMemo((): CollectionOptions | undefined => {
    if (onboardingSettings.fieldOption === undefined) {
      return undefined;
    }

    const options: CollectionOptions = {
      fields: onboardingSettings.fieldOption,
    };

    if (onboardingSettings.futureRequirements !== undefined) {
      options.futureRequirements = onboardingSettings.futureRequirements;
    }

    if (
      onboardingSettings.requirements !== undefined &&
      onboardingSettings.requirementsList
    ) {
      const requirementsArray = onboardingSettings.requirementsList
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (requirementsArray.length > 0) {
        if (onboardingSettings.requirements === 'only') {
          options.requirements = { only: requirementsArray };
        } else {
          options.requirements = { exclude: requirementsArray };
        }
      }
    }

    return options;
  }, [
    onboardingSettings.fieldOption,
    onboardingSettings.futureRequirements,
    onboardingSettings.requirements,
    onboardingSettings.requirementsList,
  ]);

  const isModal = viewControllerSettings.presentationType === 'present_modally';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Account Onboarding',
          headerLeft: isModal
            ? () => (
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.headerButton}
                >
                  {Platform.OS === 'ios' ? (
                    <SymbolView
                      name="xmark"
                      size={20}
                      tintColor={Colors.icon.primary}
                      style={styles.symbolView}
                    />
                  ) : (
                    <Text style={styles.headerIcon}>✕</Text>
                  )}
                </TouchableOpacity>
              )
            : undefined,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/configure-appearance')}
              style={styles.headerButton}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name="paintpalette"
                  size={22}
                  tintColor={Colors.icon.primary}
                  style={styles.symbolView}
                />
              ) : (
                <Text style={styles.headerIcon}>🎨</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ConnectScreen>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setVisible(true)}
          >
            <Text style={styles.buttonText}>Show Onboarding</Text>
          </TouchableOpacity>

          {visible ? (
            <ConnectAccountOnboarding
              title="Account Onboarding"
              fullTermsOfServiceUrl={onboardingSettings.fullTermsOfServiceUrl}
              recipientTermsOfServiceUrl={
                onboardingSettings.recipientTermsOfServiceUrl
              }
              privacyPolicyUrl={onboardingSettings.privacyPolicyUrl}
              collectionOptions={collectionOptions}
              onLoadError={(err) => {
                Alert.alert('Error', err.error.message);
              }}
              onExit={handleOnboardingExit}
            />
          ) : null}
        </View>
      </ConnectScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingTop: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: Colors.icon.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.background.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  headerButton: {
    padding: 8,
  },
  symbolView: {
    width: 22,
    height: 22,
  },
  headerIcon: {
    fontSize: 24,
  },
});
