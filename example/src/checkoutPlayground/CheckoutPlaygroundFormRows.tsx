import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../colors';
import type { SelectionOption } from './types';

export function PickerRow({
  title,
  description,
  selectedValue,
  options,
  onValueChange,
}: {
  title: string;
  description?: string;
  selectedValue: string;
  options: SelectionOption<string>[];
  onValueChange(value: string): void;
}) {
  const [isSelectionVisible, setSelectionVisible] = useState(false);
  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelectionVisible(true)}
        style={styles.row}
      >
        <View style={styles.rowTextContainer}>
          <Text style={styles.rowTitle}>{title}</Text>
          {description ? (
            <Text style={styles.rowDescription}>{description}</Text>
          ) : null}
        </View>
        <View style={styles.selectionTrigger}>
          <Text numberOfLines={1} style={styles.selectionTriggerText}>
            {selectedOption?.label ?? selectedValue}
          </Text>
          <Text style={styles.selectionChevron}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <SelectionModal
        description={description}
        onClose={() => setSelectionVisible(false)}
        onSelect={(value) => {
          onValueChange(value);
          setSelectionVisible(false);
        }}
        options={options}
        selectedValue={selectedValue}
        title={title}
        visible={isSelectionVisible}
      />
    </>
  );
}

export function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange(nextValue: boolean): void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTextContainer}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#DCE6F1', true: '#A3BCFF' }}
        thumbColor={value ? colors.blurple : colors.white}
      />
    </View>
  );
}

export function InputRow({
  title,
  description,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
}: {
  title: string;
  description?: string;
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.rowTitle}>{title}</Text>
      {description ? (
        <Text style={styles.rowDescription}>{description}</Text>
      ) : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dark_gray}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  description,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  description?: string;
  options: SelectionOption<string>[];
  selectedValue: string;
  onSelect(value: string): void;
  onClose(): void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.selectionModalRoot}>
        <Pressable onPress={onClose} style={styles.selectionModalBackdrop} />
        <View style={styles.selectionSheet}>
          <View style={styles.selectionSheetHandle} />
          <View style={styles.selectionSheetHeader}>
            <View style={styles.selectionSheetHeaderText}>
              <Text style={styles.selectionSheetTitle}>{title}</Text>
              {description ? (
                <Text style={styles.selectionSheetDescription}>
                  {description}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.selectionCloseButton}
            >
              <Text style={styles.selectionCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.selectionSheetContent}
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  onPress={() => onSelect(option.value)}
                  style={[
                    styles.selectionOption,
                    isSelected && styles.selectionOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectionOptionText,
                      isSelected && styles.selectionOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.selectionOptionState,
                      isSelected && styles.selectionOptionStateSelected,
                    ]}
                  >
                    {isSelected ? 'Selected' : 'Choose'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: '#E4ECF5',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    marginBottom: 12,
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
  selectionTrigger: {
    minWidth: 116,
    maxWidth: 152,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.light_gray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionTriggerText: {
    flex: 1,
    color: colors.slate,
    fontWeight: '600',
    marginRight: 8,
  },
  selectionChevron: {
    color: colors.dark_gray,
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    borderColor: '#D9E4F2',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.white,
    color: colors.slate,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  selectionModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 37, 64, 0.18)',
  },
  selectionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  selectionSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#0A2540',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
    maxHeight: '72%',
  },
  selectionSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9E4F2',
    marginBottom: 16,
  },
  selectionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  selectionSheetHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  selectionSheetTitle: {
    color: colors.slate,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectionSheetDescription: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
  selectionCloseButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  selectionCloseButtonText: {
    color: colors.blurple_dark,
    fontWeight: '700',
    fontSize: 15,
  },
  selectionSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4ECF5',
  },
  selectionOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C5D3FF',
  },
  selectionOptionText: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  selectionOptionTextSelected: {
    color: colors.blurple_dark,
  },
  selectionOptionState: {
    color: colors.dark_gray,
    fontWeight: '600',
  },
  selectionOptionStateSelected: {
    color: colors.blurple_dark,
  },
});
