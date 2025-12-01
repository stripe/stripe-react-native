import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConnectPayments } from '@stripe/stripe-react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import React, { useLayoutEffect, useMemo } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { RootStackParamList } from '../types';
import ConnectScreen from './ConnectScreen';
import { useSettings } from '../contexts/SettingsContext';
import { Colors } from '../constants/colors';

type PaymentsListDefaultFilters = NonNullable<
  ComponentProps<typeof ConnectPayments>['defaultFilters']
>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payments'>;

const PaymentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { paymentsFilterSettings } = useSettings();

  const defaultFilters = useMemo((): PaymentsListDefaultFilters | undefined => {
    const filters: PaymentsListDefaultFilters = {};

    // Convert amount filter
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

    // Convert date filter
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

    // Convert status filter
    if (paymentsFilterSettings.selectedStatuses.length > 0) {
      filters.status = paymentsFilterSettings.selectedStatuses as any;
    }

    // Convert payment method filter
    if (paymentsFilterSettings.paymentMethod !== undefined) {
      filters.paymentMethod = paymentsFilterSettings.paymentMethod
        .toLowerCase()
        .replace(/ /g, '_') as any;
    }

    // Return undefined if no filters are set
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [paymentsFilterSettings]);

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
      <ConnectPayments
        defaultFilters={defaultFilters}
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
};

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

export default PaymentsScreen;
