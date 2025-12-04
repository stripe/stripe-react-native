import { ConnectPayments } from '@stripe/stripe-react-native';
import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import type { PaymentsListDefaultFilters } from '../types';
import ConnectScreen from '../screens/ConnectScreen';

export default function ConnectPaymentsView() {
  const { paymentsFilterSettings } = useSettings();

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
}
