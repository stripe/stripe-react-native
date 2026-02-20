import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import type { CollectionOptions } from '@stripe/stripe-react-native/lib/typescript/src/connect/connectTypes';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';
import ConnectScreen from '../screens/ConnectScreen';

export default function ConnectAccountOnboardingView() {
  const { onboardingSettings } = useSettings();
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

  return (
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
});
