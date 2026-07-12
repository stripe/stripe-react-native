import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import { colors } from '../../../colors';

type IdentifierInput = {
  type: string;
  value: string;
};

interface ComplianceIdentifiersSectionProps {
  identifierInputs: IdentifierInput[];
  missingIdentifiersSummary: string | null;
  submitIdentifiersSummary: string | null;
  onIdentifierTypeChange: (index: number, value: string) => void;
  onIdentifierValueChange: (index: number, value: string) => void;
  onAddIdentifier: () => void;
  onRemoveIdentifier: (index: number) => void;
  handleRetrieveMissingIdentifiers: () => void;
  handleSubmitIdentifiers: () => void;
}

export function ComplianceIdentifiersSection({
  identifierInputs,
  missingIdentifiersSummary,
  submitIdentifiersSummary,
  onIdentifierTypeChange,
  onIdentifierValueChange,
  onAddIdentifier,
  onRemoveIdentifier,
  handleRetrieveMissingIdentifiers,
  handleSubmitIdentifiers,
}: ComplianceIdentifiersSectionProps) {
  return (
    <Collapse title="Compliance Identifiers" initialExpanded={false}>
      <View style={styles.content}>
        <Text style={styles.heading}>Missing Identifiers</Text>
        <Text style={styles.description}>
          Retrieve the MiCA and CRS/CARF identifier requirements for the
          authenticated Link user.
        </Text>
        <Button
          title="Retrieve Missing Identifiers"
          onPress={handleRetrieveMissingIdentifiers}
          variant="primary"
        />

        {missingIdentifiersSummary ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Latest response</Text>
            <Text style={styles.summaryText} selectable>
              {missingIdentifiersSummary}
            </Text>
          </View>
        ) : null}

        <Text style={styles.heading}>Submit Identifiers</Text>
        <Text style={styles.description}>
          Add one or more identifiers and submit them as a batch.
        </Text>

        {identifierInputs.map((identifierInput, index) => (
          <View key={`identifier-${index}`} style={styles.identifierContainer}>
            <Text
              style={styles.identifierTitle}
            >{`Identifier ${index + 1}`}</Text>
            <FormField
              label="Identifier Type"
              value={identifierInput.type}
              onChangeText={(text) => onIdentifierTypeChange(index, text)}
              placeholder="e.g. mt_nic"
              autoCapitalize="none"
            />
            <FormField
              label="Identifier Value"
              value={identifierInput.value}
              onChangeText={(text) => onIdentifierValueChange(index, text)}
              placeholder="Enter identifier value"
              autoCapitalize="none"
            />
            {identifierInputs.length > 1 ? (
              <Button
                title="Remove Identifier"
                onPress={() => onRemoveIdentifier(index)}
              />
            ) : null}
          </View>
        ))}

        <Button title="Add Identifier" onPress={onAddIdentifier} />
        <Button
          title="Submit Identifiers"
          onPress={handleSubmitIdentifiers}
          variant="primary"
        />

        {submitIdentifiersSummary ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Latest submission result</Text>
            <Text style={styles.summaryText} selectable>
              {submitIdentifiersSummary}
            </Text>
          </View>
        ) : null}
      </View>
    </Collapse>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingRight: 16,
    paddingVertical: 16,
  },
  heading: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: colors.dark_gray,
    marginBottom: 12,
  },
  identifierContainer: {
    borderTopColor: colors.light_gray,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  identifierTitle: {
    color: colors.slate,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: colors.light_gray,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 20,
    padding: 12,
  },
  summaryTitle: {
    color: colors.slate,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    color: colors.dark_gray,
    fontSize: 12,
    lineHeight: 18,
  },
});
