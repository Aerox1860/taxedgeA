import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import type { DirectorInfo, OpcNomineeInfo } from '../../types/director.types';
import { PromoterDirectorCard } from './PromoterDirectorCard';
import { DeleteDirectorModal } from './DeleteDirectorModal';
import { styles } from './StepPromoters.styles';

export const StepPromoters: React.FC = () => {
  const company = useCompanyRegistrationStore((state) => state.draft.company);
  const directors = useCompanyRegistrationStore((state) => state.draft.directors);
  const opcNominee = useCompanyRegistrationStore((state) => state.draft.opcNominee);
  const addDirector = useCompanyRegistrationStore((state) => state.addDirector);
  const saveDirectorToBackend = useCompanyRegistrationStore((state) => state.saveDirectorToBackend);
  const updateDirector = useCompanyRegistrationStore((state) => state.updateDirector);
  const removeDirectorFromBackend = useCompanyRegistrationStore((state) => state.removeDirectorFromBackend);
  const setOpcNominee = useCompanyRegistrationStore((state) => state.setOpcNominee);

  const [expandedDirectorId, setExpandedDirectorId] = useState<string | null>(
    directors.length > 0 ? directors[0].id : null
  );

  const [deletingDirector, setDeletingDirector] = useState<DirectorInfo | null>(null);

  const isOpc = company.companyType === 'One Person Company (OPC)';
  const minRequiredDirectors = isOpc ? 1 : company.companyType === 'Public Limited' ? 3 : 2;
  const canAddDirector = isOpc ? directors.length === 0 : true;

  // Auto-recalculate total subscribed shares & individual percentage
  const totalSubscribedShares = directors.reduce(
    (sum, d) => sum + (Number(d.numberOfShares) || 0),
    0
  );

  const getShareholdingPct = (shares: number | undefined): string => {
    if (isOpc) return '100%';
    if (!shares || !totalSubscribedShares || totalSubscribedShares <= 0) return '0%';
    const pct = (Number(shares) / totalSubscribedShares) * 100;
    if (isNaN(pct)) return '0%';
    return pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
  };

  const handleAddPromoter = () => {
    const newId = `dir-${Date.now()}`;
    addDirector({
      id: newId,
      name: '',
      pan: '',
      dob: '',
      fatherName: '',
      gender: 'Male',
      nationality: 'Indian',
      occupation: 'Professional',
      educationalQualification: 'Graduate',
      designation: 'Director',
      category: 'Promoter Director',
      email: '',
      phone: '',
      isResidentInIndia: true,
      sameAsPermanentAddress: true,
      numberOfShares: 0,
      amountSubscribed: 0,
    });
    setExpandedDirectorId(newId);
  };

  const handleSaveDirector = async (id: string, updatedFields: Partial<DirectorInfo>) => {
    const director = { ...directors.find((person) => person.id === id), ...updatedFields };
    if (!director.name?.trim() || !director.pan?.trim() || !director.email?.trim() || !director.phone?.trim()) {
      throw new Error('Enter the director name, PAN, email, and mobile number before adding.');
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(director.pan.trim())) {
      throw new Error('Enter a valid 10-character PAN.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(director.email.trim())) {
      throw new Error('Enter a valid email address.');
    }
    if (!/^[6-9][0-9]{9}$/.test(director.phone.trim())) {
      throw new Error('Enter a valid 10-digit mobile number.');
    }
    if (director.name.trim().length > 255 || director.email.trim().length > 255) {
      throw new Error('Name and email must be 255 characters or fewer.');
    }
    if (director.aadhaar && !/^\d{12}$/.test(director.aadhaar)) {
      throw new Error('Enter a valid 12-digit Aadhaar number.');
    }
    if (director.din && !/^\d{8}$/.test(director.din)) {
      throw new Error('Enter a valid 8-digit DIN.');
    }
    if (director.pinCode && !/^[1-9]\d{5}$/.test(director.pinCode)) {
      throw new Error('Enter a valid 6-digit permanent address PIN code.');
    }
    if (director.presentPincode && !/^[1-9]\d{5}$/.test(director.presentPincode)) {
      throw new Error('Enter a valid 6-digit present address PIN code.');
    }
    if (director.dob) {
      const date = new Date(`${director.dob}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(director.dob) ||
          Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== director.dob) {
        throw new Error('Enter a valid date of birth in YYYY-MM-DD format.');
      }
    }
    if (director.sharesPercentage !== undefined &&
        (!Number.isFinite(director.sharesPercentage) || director.sharesPercentage < 0 ||
          director.sharesPercentage > 100)) {
      throw new Error('Shareholding percentage must be between 0 and 100.');
    }
    updateDirector(id, updatedFields);
    await saveDirectorToBackend(id, updatedFields);
    Alert.alert('Promoter Saved', 'Promoter / director details were saved successfully.');
    setExpandedDirectorId(null);
  };

  const updateNominee = (field: keyof OpcNomineeInfo, value: string) => {
    setOpcNominee({
      name: opcNominee?.name || '',
      pan: opcNominee?.pan || '',
      aadhaar: opcNominee?.aadhaar || '',
      email: opcNominee?.email || '',
      phone: opcNominee?.phone || '',
      relationship: opcNominee?.relationship || '',
      [field]: value,
    });
  };

  const handleConfirmDelete = async () => {
    if (deletingDirector) {
      try {
        await removeDirectorFromBackend(deletingDirector.id);
        setDeletingDirector(null);
      } catch (error: unknown) {
        Alert.alert(
          'Delete Error',
          error instanceof Error ? error.message : 'Unable to remove this promoter or director.',
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Promoter / Director Details</Text>
      <Text style={styles.subheading}>
        Enter essential details of all promoters/directors for CA processing.
      </Text>

      {directors.map((director, idx) => (
        <PromoterDirectorCard
          key={director.id}
          director={director}
          index={idx}
          isExpanded={expandedDirectorId === director.id}
          canRemove={directors.length > minRequiredDirectors}
          shareholdingPct={getShareholdingPct(director.numberOfShares)}
          onToggleExpand={() =>
            setExpandedDirectorId(expandedDirectorId === director.id ? null : director.id)
          }
          onDraftChange={(updatedFields) => updateDirector(director.id, updatedFields)}
          onSave={(updatedFields) => handleSaveDirector(director.id, updatedFields)}
          onDeleteRequest={() => setDeletingDirector(director)}
        />
      ))}

      {canAddDirector && (
        <TouchableOpacity style={styles.addBtn} onPress={handleAddPromoter} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={20} color="#083B75" />
          <Text style={styles.addBtnText}>{isOpc ? '+ Add Founder' : '+ Add Promoter / Director'}</Text>
        </TouchableOpacity>
      )}

      {isOpc && (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.sectionTitle}>OPC Nominee</Text>
            {([
              ['name', 'Nominee Full Name *'],
              ['pan', 'Nominee PAN *'],
              ['aadhaar', 'Nominee Aadhaar *'],
              ['email', 'Nominee Email *'],
              ['phone', 'Nominee Mobile *'],
              ['relationship', 'Relationship *'],
            ] as const).map(([field, label]) => (
              <View key={field} style={styles.fieldGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={opcNominee?.[field] || ''}
                  onChangeText={(value) => updateNominee(field, value)}
                  autoCapitalize={field === 'pan' ? 'characters' : 'none'}
                  keyboardType={field === 'aadhaar' || field === 'phone' ? 'numeric' : field === 'email' ? 'email-address' : 'default'}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteDirectorModal
        visible={!!deletingDirector}
        directorName={deletingDirector?.name || ''}
        onCancel={() => setDeletingDirector(null)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
};
