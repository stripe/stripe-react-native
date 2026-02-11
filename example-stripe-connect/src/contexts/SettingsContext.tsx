import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_ONBOARDING_SETTINGS,
  DEFAULT_PAYMENTS_FILTER_SETTINGS,
  DEFAULT_VIEW_CONTROLLER_SETTINGS,
  STORAGE_KEYS,
} from '../constants';
import type {
  MerchantInfo,
  AppearancePreset,
  OnboardingSettings,
  PaymentsFilterSettings,
  ViewControllerSettings,
} from '../types';
import { createAPIClient } from '../api/StripeConnectAPI';

interface SettingsContextType {
  selectedMerchant: MerchantInfo | null;
  backendUrl: string;
  appearancePreset: AppearancePreset;
  onboardingSettings: OnboardingSettings;
  paymentsFilterSettings: PaymentsFilterSettings;
  viewControllerSettings: ViewControllerSettings;
  availableMerchants: MerchantInfo[];
  publishableKey: string | null;
  isLoadingMerchants: boolean;
  setSelectedMerchant: (merchant: MerchantInfo) => Promise<void>;
  setBackendUrl: (url: string) => Promise<void>;
  setAppearancePreset: (preset: AppearancePreset) => Promise<void>;
  setOnboardingSettings: (settings: OnboardingSettings) => Promise<void>;
  setPaymentsFilterSettings: (
    settings: PaymentsFilterSettings
  ) => Promise<void>;
  setViewControllerSettings: (
    settings: ViewControllerSettings
  ) => Promise<void>;
  resetBackendUrl: () => Promise<void>;
  resetOnboardingSettings: () => Promise<void>;
  resetPaymentsFilterSettings: () => Promise<void>;
  resetViewControllerSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedMerchantId, setSelectedMerchantIdState] = useState<
    string | null
  >(null);
  const [backendUrl, setBackendUrlState] =
    useState<string>(DEFAULT_BACKEND_URL);
  const [appearancePreset, setAppearancePresetState] =
    useState<AppearancePreset>('Default');
  const [onboardingSettings, setOnboardingSettingsState] =
    useState<OnboardingSettings>(DEFAULT_ONBOARDING_SETTINGS);
  const [paymentsFilterSettings, setPaymentsFilterSettingsState] =
    useState<PaymentsFilterSettings>(DEFAULT_PAYMENTS_FILTER_SETTINGS);
  const [viewControllerSettings, setViewControllerSettingsState] =
    useState<ViewControllerSettings>(DEFAULT_VIEW_CONTROLLER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Use React Query to fetch merchants
  const { data: appInfo, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ['appInfo', backendUrl],
    queryFn: async () => {
      const apiClient = createAPIClient(backendUrl);
      return await apiClient.appInfo();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const availableMerchants = useMemo(
    () => appInfo?.available_merchants ?? [],
    [appInfo?.available_merchants]
  );
  const publishableKey = appInfo?.publishable_key ?? null;

  // Find the selected merchant from the list
  const selectedMerchant = useMemo(() => {
    // If no merchant ID is selected, return null
    if (!selectedMerchantId) return null;

    // Try to find in available merchants first
    const found = availableMerchants.find(
      (m) => m.merchant_id === selectedMerchantId
    );

    // If found, return it
    if (found) return found;

    // If not found, create a custom merchant object
    // This supports custom merchant IDs entered by the user
    return {
      merchant_id: selectedMerchantId,
      display_name: 'Other',
    };
  }, [selectedMerchantId, availableMerchants]);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-select first merchant if none selected and merchants are loaded
  useEffect(() => {
    if (
      !isLoadingMerchants &&
      availableMerchants.length > 0 &&
      !selectedMerchantId
    ) {
      const firstMerchant = availableMerchants[0];
      setSelectedMerchantIdState(firstMerchant.merchant_id);
      AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_MERCHANT_ID,
        firstMerchant.merchant_id
      );
    }
  }, [isLoadingMerchants, availableMerchants, selectedMerchantId]);

  const loadSettings = async () => {
    try {
      const [
        storedMerchantId,
        storedBackendUrl,
        storedAppearance,
        storedOnboarding,
        storedPaymentsFilter,
        storedViewController,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MERCHANT_ID),
        AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL),
        AsyncStorage.getItem(STORAGE_KEYS.APPEARANCE_PRESET),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS_FILTER_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.VIEW_CONTROLLER_SETTINGS),
      ]);

      if (storedMerchantId) {
        setSelectedMerchantIdState(storedMerchantId);
      }
      if (storedBackendUrl) {
        setBackendUrlState(storedBackendUrl);
      }
      if (storedAppearance) {
        setAppearancePresetState(storedAppearance as AppearancePreset);
      }
      if (storedOnboarding) {
        setOnboardingSettingsState(JSON.parse(storedOnboarding));
      }
      if (storedPaymentsFilter) {
        setPaymentsFilterSettingsState(JSON.parse(storedPaymentsFilter));
      }
      if (storedViewController) {
        setViewControllerSettingsState(JSON.parse(storedViewController));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedMerchant = async (merchant: MerchantInfo) => {
    setSelectedMerchantIdState(merchant.merchant_id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.SELECTED_MERCHANT_ID,
      merchant.merchant_id
    );
  };

  const setBackendUrl = async (url: string) => {
    setBackendUrlState(url);
    await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, url);
  };

  const setAppearancePreset = async (preset: AppearancePreset) => {
    setAppearancePresetState(preset);
    await AsyncStorage.setItem(STORAGE_KEYS.APPEARANCE_PRESET, preset);
  };

  const setOnboardingSettings = async (settings: OnboardingSettings) => {
    setOnboardingSettingsState(settings);
    await AsyncStorage.setItem(
      STORAGE_KEYS.ONBOARDING_SETTINGS,
      JSON.stringify(settings)
    );
  };

  const setPaymentsFilterSettings = async (
    settings: PaymentsFilterSettings
  ) => {
    setPaymentsFilterSettingsState(settings);
    await AsyncStorage.setItem(
      STORAGE_KEYS.PAYMENTS_FILTER_SETTINGS,
      JSON.stringify(settings)
    );
  };

  const setViewControllerSettings = async (
    settings: ViewControllerSettings
  ) => {
    setViewControllerSettingsState(settings);
    await AsyncStorage.setItem(
      STORAGE_KEYS.VIEW_CONTROLLER_SETTINGS,
      JSON.stringify(settings)
    );
  };

  const resetBackendUrl = async () => {
    await setBackendUrl(DEFAULT_BACKEND_URL);
  };

  const resetOnboardingSettings = async () => {
    await setOnboardingSettings(DEFAULT_ONBOARDING_SETTINGS);
  };

  const resetPaymentsFilterSettings = async () => {
    await setPaymentsFilterSettings(DEFAULT_PAYMENTS_FILTER_SETTINGS);
  };

  const resetViewControllerSettings = async () => {
    await setViewControllerSettings(DEFAULT_VIEW_CONTROLLER_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        selectedMerchant,
        backendUrl,
        appearancePreset,
        onboardingSettings,
        paymentsFilterSettings,
        viewControllerSettings,
        availableMerchants,
        publishableKey,
        isLoadingMerchants,
        setSelectedMerchant,
        setBackendUrl,
        setAppearancePreset,
        setOnboardingSettings,
        setPaymentsFilterSettings,
        setViewControllerSettings,
        resetBackendUrl,
        resetOnboardingSettings,
        resetPaymentsFilterSettings,
        resetViewControllerSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
