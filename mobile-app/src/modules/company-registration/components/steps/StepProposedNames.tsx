import React, { useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { companyRegistrationApi } from '../../services/companyRegistrationApi';
import { CompanySectionCard } from '../CompanySectionCard/CompanySectionCard';
import { styles } from './StepProposedNames.styles';

type NameCheckState = {
  checking: boolean;
  names: [string, string];
  results: [boolean | null, boolean | null];
  error: string | null;
};

export const StepProposedNames: React.FC = () => {
  const company = useCompanyRegistrationStore((state) => state.draft.company);
  const updateDetails = useCompanyRegistrationStore((state) => state.updateCompanyDetails);
  const [nameCheck, setNameCheck] = useState<NameCheckState>({
    checking: false,
    names: ['', ''],
    results: [null, null],
    error: null,
  });

  const getSuffix = () => {
    switch (company.companyType) {
      case 'One Person Company (OPC)':
        return '(OPC) Private Limited';
      case 'Section 8 (NGO)':
        return 'Foundation / Section 8';
      case 'Public Limited':
        return 'Limited';
      default:
        return 'Private Limited';
    }
  };

  const checkNameAvailability = async () => {
    const names: [string, string] = [
      company.proposedName1.trim(),
      company.proposedName2.trim(),
    ];
    const results: [boolean | null, boolean | null] = [null, null];
    const indexes = names
      .map((name, index) => (name ? index : -1))
      .filter((index) => index >= 0);

    if (indexes.length === 0) {
      setNameCheck({ checking: false, names, results, error: 'Enter at least one proposed name to check.' });
      return;
    }

    setNameCheck({ checking: true, names, results, error: null });
    try {
      const responses = await Promise.all(
        indexes.map((index) => companyRegistrationApi.checkNameAvailability(names[index])),
      );
      responses.forEach((response, resultIndex) => {
        results[indexes[resultIndex]] = response.available;
      });
      setNameCheck({ checking: false, names, results, error: null });
    } catch (error: unknown) {
      setNameCheck({
        checking: false,
        names,
        results,
        error: error instanceof Error ? error.message : 'Unable to check proposed names. Please try again.',
      });
    }
  };

  const nameCheckResult = (index: 0 | 1) => {
    const currentName = index === 0 ? company.proposedName1.trim() : company.proposedName2.trim();
    if (!currentName || currentName !== nameCheck.names[index]) return null;
    return nameCheck.results[index];
  };

  return (
    <CompanySectionCard
      title="Proposed Company Names"
      description="Provide up to 2 preferred names for SPICe+ Part A name reservation / incorporation."
    >
      {/* 1st Preferred Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>First Preferred Name *</Text>
        <TextInput
          style={styles.input}
          value={company.proposedName1}
          onChangeText={(val) => {
            updateDetails({ proposedName1: val });
            setNameCheck((previous) => ({ ...previous, error: null }));
          }}
          placeholder="First Preference Name"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* 2nd Preferred Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Second Preferred Name *</Text>
        <TextInput
          style={styles.input}
          value={company.proposedName2}
          onChangeText={(val) => {
            updateDetails({ proposedName2: val });
            setNameCheck((previous) => ({ ...previous, error: null }));
          }}
          placeholder="Second Preference Name"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Mandatory Suffix */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Mandatory Suffix</Text>
        <View style={styles.suffixBadge}>
          <Text style={styles.suffixText}>Legal Suffix: {getSuffix()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkButton, nameCheck.checking && styles.checkButtonDisabled]}
        onPress={checkNameAvailability}
        disabled={nameCheck.checking}
        activeOpacity={0.8}
      >
        {nameCheck.checking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.checkButtonText}>Check proposed names</Text>
        )}
      </TouchableOpacity>

      <View style={styles.statusCard}>
        <Ionicons name="information-circle-outline" size={20} color="#083B75" />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusText}>TaxEdge registration match check</Text>
          <Text style={styles.statusDescription}>
            {nameCheck.error || 'This checks exact matches in existing TaxEdge registrations only. It does not reserve a name or check MCA availability.'}
          </Text>
          {([0, 1] as const).map((index) => {
            const result = nameCheckResult(index);
            const label = index === 0 ? 'First' : 'Second';
            const state = result === null
              ? 'Not checked'
              : result
                ? 'No exact TaxEdge match found'
                : 'An exact TaxEdge match already exists';
            return (
              <Text key={label} style={styles.nameCheckResult}>
                {label} name: {state}
              </Text>
            );
          })}
        </View>
      </View>
    </CompanySectionCard>
  );
};
