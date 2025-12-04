import { ConnectPayments } from '@stripe/stripe-react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../src/constants/colors';
import { useSettings } from '../src/contexts/SettingsContext';
import type { PaymentsListDefaultFilters } from '../src/types';
import ConnectScreen from '../src/screens/ConnectScreen';

export default function PaymentsScreen() {
  const router = useRouter();
  const { paymentsFilterSettings, viewControllerSettings } = useSettings();

  const defaultFilters = useMemo((): PaymentsListDefaultFilters | undefined => {
    const filters: PaymentsListDefaultFilters = {};

    if (paymentsFilterSettings.amountFilterType !== undefined) {
      switch (paymentsFilterSettings.amountFilterType) {
        case 'equals':
          if (paymentsFilterSettings.amountValue !== undefined) {
            filters.amount = {
              equals: paymentsFilterSettings.amountValue,
            };
          }
          break;
        case 'greater_than':
          if (paymentsFilterSettings.amountValue !== undefined) {
            filters.amount = {
              greaterThan: paymentsFilterSettings.amountValue,
            };
          }
          break;
        case 'less_than':
          if (paymentsFilterSettings.amountValue !== undefined) {
            filters.amount = {
              lessThan: paymentsFilterSettings.amountValue,
            };
          }
          break;
        case 'between':
          if (
            paymentsFilterSettings.amountLowerBound !== undefined &&
            paymentsFilterSettings.amountUpperBound !== undefined
          ) {
            filters.amount = {
              between: {
                lowerBound: paymentsFilterSettings.amountLowerBound,
                upperBound: paymentsFilterSettings.amountUpperBound,
              },
            };
          }
          break;
      }
    }

    if (paymentsFilterSettings.dateFilterType !== undefined) {
      switch (paymentsFilterSettings.dateFilterType) {
        case 'before':
          if (paymentsFilterSettings.dateValue) {
            filters.date = {
              before: new Date(paymentsFilterSettings.dateValue),
            };
          }
          break;
        case 'after':
          if (paymentsFilterSettings.dateValue) {
            filters.date = {
              after: new Date(paymentsFilterSettings.dateValue),
            };
          }
          break;
        case 'between':
          if (
            paymentsFilterSettings.startDate &&
            paymentsFilterSettings.endDate
          ) {
            filters.date = {
              between: {
                start: new Date(paymentsFilterSettings.startDate),
                end: new Date(paymentsFilterSettings.endDate),
              },
            };
          }
          break;
      }
    }

    filters.status = paymentsFilterSettings.selectedStatuses;
    filters.paymentMethod = paymentsFilterSettings.paymentMethod;

    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [paymentsFilterSettings]);

  const isModal = viewControllerSettings.presentationType === 'present_modally';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payments',
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
        <ConnectPayments
          defaultFilters={defaultFilters}
          onLoadError={(err) => {
            Alert.alert('Error', err.error.message);
          }}
        />
      </ConnectScreen>
    </>
  );
}

const styles = StyleSheet.create({
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
