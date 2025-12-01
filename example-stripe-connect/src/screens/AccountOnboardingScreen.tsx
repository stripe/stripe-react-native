import React, { useState, useLayoutEffect, useCallback } from 'react';
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
            collectionOptions={
              onboardingSettings.fieldOption !== undefined ||
              onboardingSettings.futureRequirements !== undefined
                ? ({
                    ...(onboardingSettings.fieldOption !== undefined
                      ? {
                          fields: onboardingSettings.fieldOption
                            ? 'eventually_due'
                            : 'currently_due',
                        }
                      : {}),
                    ...(onboardingSettings.futureRequirements !== undefined
                      ? {
                          futureRequirements:
                            onboardingSettings.futureRequirements
                              ? 'include'
                              : 'omit',
                        }
                      : {}),
                  } as any)
                : undefined
            }
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
