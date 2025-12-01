import React, { useState, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { SymbolView } from 'expo-symbols';
import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import type { CollectionOptions } from '@stripe/stripe-react-native/lib/typescript/src/connect/connectTypes';
import ConnectScreen from './ConnectScreen';
import { useSettings } from '../contexts/SettingsContext';
import { Colors } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AccountOnboarding'
>;

const AccountOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { onboardingSettings } = useSettings();
  const [visible, setVisible] = useState(false);

  const handleOnboardingExit = useCallback(() => {
    console.log('User exited account onboarding');
    setVisible(false);
  }, []);

  // Build collectionOptions with proper typing
  const collectionOptions = useMemo((): CollectionOptions | undefined => {
    // Only create collectionOptions if we have at least the fieldOption set
    // (which provides the required 'fields' property)
    if (onboardingSettings.fieldOption === undefined) {
      return undefined;
    }

    const options: CollectionOptions = {
      fields: onboardingSettings.fieldOption,
    };

    // Add optional futureRequirements if set
    if (onboardingSettings.futureRequirements !== undefined) {
      options.futureRequirements = onboardingSettings.futureRequirements;
    }

    // Add optional requirements if set
    if (
      onboardingSettings.requirements !== undefined &&
      onboardingSettings.requirementsList
    ) {
      // Split by lines and filter out empty lines
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('ConfigureAppearance')}
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
    });
  }, [navigation]);

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
};

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

export default AccountOnboardingScreen;
