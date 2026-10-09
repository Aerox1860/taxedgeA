import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { companyRegistrationApi, type RegistrationDetails } from '../../services/companyRegistrationApi';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { styles } from './StepReviewApplication.styles';

interface StepReviewApplicationProps {
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
}

const formatLabel = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const DetailRows: React.FC<{ values: object; hiddenFields?: string[] }> = ({ values, hiddenFields = [] }) => (
  <>
    {Object.entries(values)
      .filter(([key]) => !hiddenFields.includes(key))
      .map(([key, value]) => (
        <View key={key} style={styles.dataRow}>
          <Text style={styles.dataLabel}>{formatLabel(key)}</Text>
          <Text selectable style={styles.dataValue}>{formatValue(value)}</Text>
        </View>
      ))}
  </>
);

export const StepReviewApplication: React.FC<StepReviewApplicationProps> = ({
  onConfirm,
  isConfirming,
}) => {
  const draft = useCompanyRegistrationStore((state) => state.draft);
  const setStep = useCompanyRegistrationStore((state) => state.setStep);
  const hydrateFromBackend = useCompanyRegistrationStore((state) => state.hydrateFromBackend);
  const [registration, setRegistration] = useState<RegistrationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadRegistration = useCallback(async () => {
    if (!draft.id) {
      setLoadError('The saved company registration could not be found.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await companyRegistrationApi.get(draft.id);
      setRegistration(data);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load the latest saved application.');
    } finally {
      setIsLoading(false);
    }
  }, [draft.id]);

  useEffect(() => {
    void loadRegistration();
  }, [loadRegistration]);

  const openSavedStep = async (step: number) => {
    if (isEditing || !draft.id) return;
    setIsEditing(true);
    try {
      await hydrateFromBackend(draft.id, step);
      setStep(step);
    } catch (error: unknown) {
      Alert.alert('Load Error', error instanceof Error ? error.message : 'Unable to load the saved application section.');
      setIsEditing(false);
    }
  };

  const editButton = (step: number) => (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => void openSavedStep(step)}
      disabled={isEditing || isLoading}
      hitSlop={8}
    >
      <Text style={styles.editBtn}>{isEditing ? 'Loading…' : 'Edit'}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Review & Confirm</Text>
        <ActivityIndicator accessibilityLabel="Loading saved application details" />
        <Text style={styles.subheading}>Loading the latest saved details from your application…</Text>
      </View>
    );
  }

  if (!registration) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Review & Confirm</Text>
        <Text accessibilityRole="alert" style={styles.errorText}>{loadError || 'Unable to load your application.'}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => void loadRegistration()} style={styles.retryButton}>
          <Text style={styles.confirmButtonText}>Retry loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const application = registration.application;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Review & Confirm</Text>
      <Text style={styles.subheading}>
        Verify the information saved on the server. Use Edit to return to a section; your changes must be saved before returning here.
      </Text>
      {loadError ? <Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text> : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Application</Text>
          {editButton(0)}
        </View>
        <DetailRows values={application} />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Company Details</Text>
          {editButton(1)}
        </View>
        {registration.companyDetails
          ? <DetailRows values={registration.companyDetails} hiddenFields={['id']} />
          : <Text style={styles.emptyText}>No company details have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Office</Text>
          {editButton(2)}
        </View>
        {registration.registeredOffice
          ? <DetailRows values={registration.registeredOffice} hiddenFields={['id']} />
          : <Text style={styles.emptyText}>No registered office details have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Promoters, Directors & Nominees</Text>
          {editButton(3)}
        </View>
        {registration.persons.length
          ? registration.persons.map((person, index) => (
              <View key={person.id} style={styles.nestedCard}>
                <Text style={styles.nestedTitle}>
                  {person.personType}: {person.name || `Person ${index + 1}`}
                </Text>
                <DetailRows values={person} hiddenFields={['id']} />
              </View>
            ))
          : <Text style={styles.emptyText}>No promoter, director, or nominee records have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Capital</Text>
          {editButton(4)}
        </View>
        {registration.capital
          ? <DetailRows values={registration.capital} hiddenFields={['id']} />
          : <Text style={styles.emptyText}>No capital details have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shareholdings</Text>
          {editButton(4)}
        </View>
        {registration.shareholdings.length
          ? registration.shareholdings.map((shareholding) => (
              <View key={shareholding.id} style={styles.nestedCard}>
                <DetailRows values={shareholding} hiddenFields={['id']} />
              </View>
            ))
          : <Text style={styles.emptyText}>No shareholding records have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
          {editButton(5)}
        </View>
        {registration.documents.length
          ? registration.documents.map((document) => (
              <View key={document.id} style={styles.nestedCard}>
                <View style={styles.documentHeader}>
                  <Text style={styles.nestedTitle}>{document.name || document.documentType}</Text>
                  <Text style={[
                    styles.documentStatus,
                    document.status.toUpperCase() === 'UPLOADED' ? styles.uploadedStatus : styles.pendingStatus,
                  ]}>
                    {document.status}
                  </Text>
                </View>
                <DetailRows
                  values={document}
                  hiddenFields={['id', 'custId', 'fileUri']}
                />
              </View>
            ))
          : <Text style={styles.emptyText}>No document records have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked Registrations</Text>
          {editButton(6)}
        </View>
        {registration.linkedRegistrations
          ? <DetailRows values={registration.linkedRegistrations} />
          : <Text style={styles.emptyText}>No linked registration selections have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved Payments</Text>
        </View>
        {registration.payments.length
          ? registration.payments.map((payment) => (
              <View key={payment.id} style={styles.nestedCard}>
                <DetailRows values={payment} hiddenFields={['id']} />
              </View>
            ))
          : <Text style={styles.emptyText}>No payment records have been saved.</Text>}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Application Tracking</Text>
        </View>
        {registration.tracking.length
          ? registration.tracking.map((stage) => (
              <View key={stage.id} style={styles.nestedCard}>
                <Text style={styles.nestedTitle}>{stage.stage}</Text>
                <DetailRows values={stage} hiddenFields={['id', 'stage']} />
              </View>
            ))
          : <Text style={styles.emptyText}>No tracking events have been saved.</Text>}
      </View>

      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed, disabled: isConfirming }}
        style={styles.confirmationRow}
        onPress={() => setConfirmed((value) => !value)}
        disabled={isConfirming}
      >
        <Ionicons
          name={confirmed ? 'checkbox' : 'square-outline'}
          size={23}
          color={confirmed ? '#083B75' : '#64748B'}
        />
        <Text style={styles.confirmationText}>
          I confirm that I have reviewed the saved information and it is correct.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.confirmButton, (!confirmed || isConfirming) && styles.disabledButton]}
        onPress={() => void onConfirm()}
        disabled={!confirmed || isConfirming}
      >
        {isConfirming
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.confirmButtonText}>Confirm & Continue to Fees</Text>}
      </TouchableOpacity>
    </View>
  );
};
