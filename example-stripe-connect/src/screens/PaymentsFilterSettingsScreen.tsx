import React, {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  PaymentsFilterSettings,
  AmountFilterType,
  DateFilterType,
  PaymentStatus,
} from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Separator } from '../components/Separator';
import { ChevronRight } from '../components/ChevronRight';
import { SelectableRow } from '../components/SelectableRow';
import { DropdownMenu, type DropdownOption } from '../components/DropdownModal';
import { AmountInput } from '../components/AmountInput';
import {
  AMOUNT_FILTER_TYPES,
  DATE_FILTER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../constants';
import { Colors } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PaymentsFilterSettings'
>;

const AMOUNT_FILTER_OPTIONS: DropdownOption[] = [
  { label: 'None', value: 'undefined' },
  ...AMOUNT_FILTER_TYPES.map((type) => ({
    label: type.label,
    value: type.value,
  })),
];

const DATE_FILTER_OPTIONS: DropdownOption[] = [
  { label: 'None', value: 'undefined' },
  ...DATE_FILTER_TYPES.map((type) => ({
    label: type.label,
    value: type.value,
  })),
];

// Helper functions for filter type conversion
const filterTypeToString = (
  value: AmountFilterType | DateFilterType | undefined
): string => {
  return value === undefined ? 'undefined' : value;
};

const filterTypeToLabel = (
  value: AmountFilterType | DateFilterType | undefined,
  isAmountFilter: boolean
): string => {
  if (value === undefined) return 'None';
  const types = isAmountFilter ? AMOUNT_FILTER_TYPES : DATE_FILTER_TYPES;
  const found = types.find((t) => t.value === value);
  return found?.label || value;
};

const stringToAmountFilterType = (
  value: string
): AmountFilterType | undefined => {
  return value === 'undefined' ? undefined : (value as AmountFilterType);
};

const stringToDateFilterType = (value: string): DateFilterType | undefined => {
  return value === 'undefined' ? undefined : (value as DateFilterType);
};

const PaymentsFilterSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    paymentsFilterSettings,
    setPaymentsFilterSettings,
    resetPaymentsFilterSettings,
  } = useSettings();

  const [localSettings, setLocalSettings] = useState<PaymentsFilterSettings>(
    paymentsFilterSettings
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    'dateValue' | 'startDate' | 'endDate'
  >('dateValue');
  const [tempDate, setTempDate] = useState(new Date());
  const datePickerSlideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (showDatePicker) {
      setDatePickerVisible(true);
      Animated.spring(datePickerSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else if (datePickerVisible) {
      Animated.timing(datePickerSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setDatePickerVisible(false);
      });
    }
  }, [showDatePicker, datePickerVisible, datePickerSlideAnim]);

  const handleSave = useCallback(async () => {
    await setPaymentsFilterSettings(localSettings);
    navigation.goBack();
  }, [localSettings, setPaymentsFilterSettings, navigation]);

  const handleReset = useCallback(async () => {
    await resetPaymentsFilterSettings();
    setHasChanges(false);
  }, [resetPaymentsFilterSettings]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackButtonDisplayMode: 'minimal',
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

  const updateSetting = <K extends keyof PaymentsFilterSettings>(
    key: K,
    value: PaymentsFilterSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    console.log('newSettings:', key, value);
    setLocalSettings(newSettings);
    setHasChanges(
      JSON.stringify(newSettings) !== JSON.stringify(paymentsFilterSettings)
    );
  };

  const toggleStatus = (status: PaymentStatus) => {
    const currentStatuses = localSettings.selectedStatuses;
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    updateSetting('selectedStatuses', newStatuses);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      const date = new Date();
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const openDatePicker = (field: 'dateValue' | 'startDate' | 'endDate') => {
    const existingDate = localSettings[field];
    setTempDate(existingDate ? new Date(existingDate) : new Date());
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      updateSetting(datePickerField, dateString);
      setTempDate(selectedDate);
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const paymentMethodOptions: DropdownOption[] = PAYMENT_METHODS.map(
    (method) => ({
      label: method,
      value: method,
    })
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          bottomOffset={20}
          extraKeyboardSpace={20}
        >
          {/* Amount Filter */}
          <Text style={styles.sectionHeader}>Amount Filter</Text>
          <View style={styles.section}>
            <DropdownMenu
              trigger={
                <View style={styles.dropdownOption}>
                  <Text style={styles.dropdownLabel}>Amount Filter Type</Text>
                  <View style={styles.dropdownValue}>
                    <Text style={styles.dropdownValueText}>
                      {filterTypeToLabel(localSettings.amountFilterType, true)}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={AMOUNT_FILTER_OPTIONS}
              selectedValue={filterTypeToString(localSettings.amountFilterType)}
              onSelect={(value) =>
                updateSetting(
                  'amountFilterType',
                  stringToAmountFilterType(value)
                )
              }
            />

            {localSettings.amountFilterType !== undefined &&
              localSettings.amountFilterType !== 'between' && (
                <>
                  <Separator />
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Amount (dollars)</Text>
                    <AmountInput
                      value={localSettings.amountValue}
                      onValueChange={(value) =>
                        updateSetting('amountValue', value)
                      }
                    />
                  </View>
                </>
              )}

            {localSettings.amountFilterType === 'between' && (
              <>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Lower bound (dollars)</Text>
                  <AmountInput
                    value={localSettings.amountLowerBound}
                    onValueChange={(value) =>
                      updateSetting('amountLowerBound', value)
                    }
                  />
                </View>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Upper bound (dollars)</Text>
                  <AmountInput
                    value={localSettings.amountUpperBound}
                    onValueChange={(value) =>
                      updateSetting('amountUpperBound', value)
                    }
                  />
                </View>
              </>
            )}
          </View>

          {/* Date Filter */}
          <Text style={styles.sectionHeader}>Date Filter</Text>
          <View style={styles.section}>
            <DropdownMenu
              trigger={
                <View style={styles.dropdownOption}>
                  <Text style={styles.dropdownLabel}>Date Filter Type</Text>
                  <View style={styles.dropdownValue}>
                    <Text style={styles.dropdownValueText}>
                      {filterTypeToLabel(localSettings.dateFilterType, false)}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={DATE_FILTER_OPTIONS}
              selectedValue={filterTypeToString(localSettings.dateFilterType)}
              onSelect={(value) =>
                updateSetting('dateFilterType', stringToDateFilterType(value))
              }
            />

            {localSettings.dateFilterType === 'before' && (
              <>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Before Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker('dateValue')}
                  >
                    <Text style={styles.dateText}>
                      {formatDate(localSettings.dateValue)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {localSettings.dateFilterType === 'after' && (
              <>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>After Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker('dateValue')}
                  >
                    <Text style={styles.dateText}>
                      {formatDate(localSettings.dateValue)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {localSettings.dateFilterType === 'between' && (
              <>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker('startDate')}
                  >
                    <Text style={styles.dateText}>
                      {formatDate(localSettings.startDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Separator />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker('endDate')}
                  >
                    <Text style={styles.dateText}>
                      {formatDate(localSettings.endDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Status Filter */}
          <Text style={styles.sectionHeader}>Status Filter</Text>
          <View style={styles.section}>
            {PAYMENT_STATUSES.map((status, index) => (
              <View key={status.value}>
                <SelectableRow
                  title={status.label}
                  selected={localSettings.selectedStatuses.includes(
                    status.value
                  )}
                  onPress={() => toggleStatus(status.value)}
                />
                {index < PAYMENT_STATUSES.length - 1 && <Separator />}
              </View>
            ))}
          </View>

          {/* Payment Method Filter */}
          <Text style={styles.sectionHeader}>Payment Method Filter</Text>
          <View style={styles.section}>
            <DropdownMenu
              trigger={
                <View style={styles.dropdownOption}>
                  <Text style={styles.dropdownLabel}>Payment Method</Text>
                  <View style={styles.dropdownValue}>
                    <Text style={styles.dropdownValueText}>
                      {localSettings.paymentMethod || 'None'}
                    </Text>
                    <ChevronRight />
                  </View>
                </View>
              }
              options={paymentMethodOptions}
              selectedValue={localSettings.paymentMethod || 'None'}
              onSelect={(value) =>
                updateSetting(
                  'paymentMethod',
                  value === 'None' ? undefined : value
                )
              }
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to defaults</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>

      {/* Date Picker */}
      {datePickerVisible && (
        <>
          {Platform.OS === 'ios' && (
            <Animated.View
              style={[
                styles.datePickerContainer,
                {
                  transform: [{ translateY: datePickerSlideAnim }],
                },
              ]}
            >
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            </Animated.View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </>
      )}
    </SafeAreaView>
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
  backButton: {
    fontSize: 17,
    color: Colors.text.link,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButtonDisabled: {
    color: Colors.text.disabled,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border.default,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background.primary,
  },
  dropdownLabel: {
    fontSize: 17,
    color: Colors.text.primary,
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownValueText: {
    fontSize: 17,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    color: Colors.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
  },
  dateLabel: {
    fontSize: 17,
    color: Colors.text.primary,
  },
  dateInput: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
  },
  dateText: {
    fontSize: 17,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  amountInput: {
    backgroundColor: Colors.background.input,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
    fontSize: 17,
    color: Colors.text.primary,
    textAlign: 'right',
  },
  resetButton: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  resetButtonText: {
    fontSize: 17,
    color: Colors.text.link,
  },
  datePickerContainer: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border.default,
    width: '100%',
    backgroundColor: Colors.background.primary,
  },
  datePickerDone: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.link,
  },
});

export default PaymentsFilterSettingsScreen;
