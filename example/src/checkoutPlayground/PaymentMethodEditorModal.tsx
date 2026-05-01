import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../colors';
import { normalizePaymentMethodTypes } from './types';
import { InputRow } from './CheckoutPlaygroundFormRows';
import { GroupedCard } from './CheckoutPlaygroundUI';

export function PaymentMethodEditorModal({
  visible,
  availableMethods,
  selectedMethods,
  onClose,
  onChangeSelectedMethods,
}: {
  visible: boolean;
  availableMethods: readonly string[];
  selectedMethods: string[];
  onClose(): void;
  onChangeSelectedMethods(nextMethods: string[]): void;
}) {
  const [searchText, setSearchText] = useState('');
  const [customMethodType, setCustomMethodType] = useState('');

  const filteredMethods = useMemo(() => {
    if (!searchText.trim()) {
      return availableMethods;
    }

    return availableMethods.filter((method) =>
      method.toLowerCase().includes(searchText.trim().toLowerCase())
    );
  }, [availableMethods, searchText]);

  const toggleMethod = (method: string) => {
    const nextMethods = selectedMethods.includes(method)
      ? selectedMethods.filter((value) => value !== method)
      : [...selectedMethods, method];
    onChangeSelectedMethods(normalizePaymentMethodTypes(nextMethods));
  };

  const addCustomMethod = () => {
    const trimmed = customMethodType.trim().toLowerCase();
    if (!trimmed) {
      return;
    }

    onChangeSelectedMethods(
      normalizePaymentMethodTypes([...selectedMethods, trimmed])
    );
    setCustomMethodType('');
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select payment methods</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <InputRow
            title="Search"
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Filter payment methods"
          />

          <InputRow
            title="Custom payment method"
            description="Add any payment method type supported by your backend."
            value={customMethodType}
            onChangeText={setCustomMethodType}
            placeholder="for example: paypal"
          />

          <TouchableOpacity
            disabled={!customMethodType.trim()}
            onPress={addCustomMethod}
            style={[
              styles.inlineActionButton,
              !customMethodType.trim() && styles.inlineActionButtonDisabled,
            ]}
          >
            <Text style={styles.inlineActionText}>Add custom method</Text>
          </TouchableOpacity>

          <GroupedCard>
            {filteredMethods.map((method) => {
              const isSelected = selectedMethods.includes(method);

              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => toggleMethod(method)}
                  style={styles.methodRow}
                >
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowTitle}>
                      {method.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.rowDescription}>{method}</Text>
                  </View>
                  <Text
                    style={[
                      styles.methodStatus,
                      isSelected && styles.methodStatusSelected,
                    ]}
                  >
                    {isSelected ? 'Selected' : 'Add'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </GroupedCard>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    color: colors.slate,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDoneText: {
    color: colors.blurple_dark,
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 32,
  },
  inlineActionButton: {
    backgroundColor: colors.slate,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineActionButtonDisabled: {
    opacity: 0.45,
  },
  inlineActionText: {
    color: colors.white,
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: '#E4ECF5',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  rowDescription: {
    color: colors.dark_gray,
    fontSize: 13,
    lineHeight: 18,
  },
  methodStatus: {
    color: colors.dark_gray,
    fontWeight: '600',
  },
  methodStatusSelected: {
    color: colors.blurple_dark,
  },
});
