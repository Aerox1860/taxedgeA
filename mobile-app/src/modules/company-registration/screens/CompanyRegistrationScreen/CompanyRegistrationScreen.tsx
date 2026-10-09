import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../shared/components/AppHeader';
import { UniversalDraftModal } from '@/shared/components/UniversalDraftModal';
import { useUniversalDraftGuard } from '@/shared/hooks/useUniversalDraftGuard';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { useAuthStore } from '../../../authentication/store/authStore';
import { JwtUtils, tokenManager } from '../../../../core/authentication/tokenManager';

import { StepCompanyType } from '../../components/steps/StepCompanyType';
import { StepCombinedDetails } from '../../components/steps/StepCombinedDetails';
import { StepRegisteredOffice } from '../../components/steps/StepRegisteredOffice';
import { StepPromoters } from '../../components/steps/StepPromoters';
import { StepCapitalShareholding } from '../../components/steps/StepCapitalShareholding';
import { StepDocumentsKYC } from '../../components/steps/StepDocumentsKYC';
import { StepLinkedRegistrations } from '../../components/steps/StepLinkedRegistrations';
import { StepReviewApplication } from '../../components/steps/StepReviewApplication';
import { StepFeesPayment } from '../../components/steps/StepFeesPayment';
import { StepApplicationTracking } from '../../components/steps/StepApplicationTracking';
import { StepSubmissionSuccess } from '../../components/steps/StepSubmissionSuccess';
import { StepApplicationReceipt } from '../../components/steps/StepApplicationReceipt';

import { styles } from './CompanyRegistrationScreen.styles';

const STEP_NAMES = [
  'Company Type Selection',
  'Company Details & Names',
  'Registered Office Details',
  'Promoter / Director Details',
  'Shareholding & Capital',
  'Documents & KYC Checklist',
  'Linked Registrations',
  'Review Application',
  'Fees & Payment Breakdown',
  'Application Tracking',
  'Submission Success',
  'Application Receipt',
];

const formatSaveError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unable to save this step. Please try again.';

export const CompanyRegistrationScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authenticatedUser = useAuthStore((state) => state.authenticatedUser);
  const customer = useAuthStore((state) => state.customer);
  const draft = useCompanyRegistrationStore((state) => state.draft);
  const pendingPersonRequests = useCompanyRegistrationStore((state) => state.pendingPersonRequests);
  const setStep = useCompanyRegistrationStore((state) => state.setStep);
  const saveWorkflowProgress = useCompanyRegistrationStore((state) => state.saveWorkflowProgress);
  const saveCurrentStep = useCompanyRegistrationStore((state) => state.saveCurrentStep);
  const hydrateFromBackend = useCompanyRegistrationStore((state) => state.hydrateFromBackend);
  const resetRegistration = useCompanyRegistrationStore((state) => state.resetRegistration);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;
    hydrateFromBackend()
      .catch((error: unknown) => {
        if (isMounted) {
          Alert.alert(
            'Load Error',
            error instanceof Error ? error.message : 'Unable to load your saved application.',
          );
        }
      })
      .then(() => {
        if (!isMounted) return;
        const hydratedDraft = useCompanyRegistrationStore.getState().draft;
        if (hydratedDraft.currentStep === 8 && hydratedDraft.paymentStatus !== 'Paid') {
          setStep(7);
        }
      })
      .finally(() => {
        if (isMounted) setIsHydrating(false);
      });
    return () => {
      isMounted = false;
    };
  }, [hydrateFromBackend, setStep]);

  const currentStep = draft.currentStep;
  const totalSteps = STEP_NAMES.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  const {
    showDraftModal,
    handleSaveAndExit,
    handleDiscardAndExit,
    handleCancel,
  } = useUniversalDraftGuard({
    isDirty: () => {
      // Dirty if they advanced past step 0 or typed something in step 0
      return currentStep > 0 || !!draft.company.companyType;
    },
    onSaveDraft: () => {
      // Draft state is already preserved in Zustand store
    },
    onDiscardDraft: () => {
      resetRegistration();
    },
    isSubmitted: () => draft.status === 'Submitted',
    discardDestination: '/(main)/home',
  });

  const handleHeaderBack = async () => {
    if (isHydrating || isSaving) return;
    if (currentStep > 0) {
      setStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleReviewConfirm = async () => {
    if (currentStep !== 7 || isHydrating || isSaving || saveInFlight.current || !draft.id) return;
    saveInFlight.current = true;
    setIsSaving(true);
    let navigationStarted = false;
    try {
      const status = await saveWorkflowProgress(8);
      if (status !== 200 && status !== 201) {
        throw new Error(`Review confirmation returned unexpected status ${status}.`);
      }
      setStep(8);
    } catch (error: unknown) {
      Alert.alert('Confirmation Error', formatSaveError(error));
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (isHydrating || isSaving || pendingPersonRequests > 0 || saveInFlight.current) return;
    console.log('[CompanyRegistration] SUBMIT START', { step: currentStep });
    if (currentStep === 9 || currentStep === 10) {
      saveInFlight.current = true;
      setIsSaving(true);
      try {
        if (!draft.id) {
          throw new Error('The saved registration could not be found.');
        }
        await hydrateFromBackend(draft.id);
        if (useCompanyRegistrationStore.getState().draft.paymentStatus !== 'Paid') {
          Alert.alert(
            'Payment Not Confirmed',
            'The backend has not confirmed successful payment yet. The success screen and receipt are available only after payment is marked as paid.',
          );
          return;
        }
        const status = await saveWorkflowProgress(currentStep + 1);
        if (status !== 200 && status !== 201) {
          throw new Error(`Progress save returned unexpected status ${status}.`);
        }
        setStep(currentStep + 1);
      } catch (error: unknown) {
        Alert.alert('Load Error', formatSaveError(error));
      } finally {
        saveInFlight.current = false;
        setIsSaving(false);
      }
      return;
    }
    if (currentStep === 0 && !draft.company.companyType?.trim()) {
      Alert.alert('Validation Error', 'Please select a company type.');
      return;
    }

    // Validation for combined Step 2 (Classification + Activity + Proposed Names)
    if (currentStep === 1) {
      if (!draft.company.primaryActivity?.trim()) {
        Alert.alert('Validation Error', 'Please enter Primary Business Activity.');
        return;
      }
      if (!/^[0-9]{5}$/.test(draft.company.nicCode?.trim() || '')) {
        Alert.alert('Validation Error', 'Please enter a valid 5-digit NIC Code.');
        return;
      }
      if (!draft.company.proposedName1?.trim()) {
        Alert.alert('Validation Error', 'Please enter 1st Preferred Name.');
        return;
      }
      if (!draft.company.proposedName2?.trim()) {
        Alert.alert('Validation Error', 'Please enter 2nd Preferred Name.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!draft.company.registeredAddressLine?.trim() || !draft.company.registeredCity?.trim() ||
          !draft.company.registeredState?.trim() || !draft.company.registeredPincode?.trim()) {
        Alert.alert('Validation Error', 'Please complete the registered office address, city, state, and PIN code.');
        return;
      }
      if (!/^[1-9][0-9]{5}$/.test(draft.company.registeredPincode.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid 6-digit PIN code.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.company.companyEmail.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid company email address.');
        return;
      }
      if (!/^[6-9][0-9]{9}$/.test(draft.company.companyMobile.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid 10-digit company mobile number.');
        return;
      }
    }

    if (currentStep === 4) {
      const authorized = Number(draft.company.authorizedCapital);
      const paidUp = Number(draft.company.paidUpCapital);
      const totalShares = Number(draft.company.numberOfShares);
      const faceValue = Number(draft.company.faceValuePerShare);
      if ([authorized, paidUp, totalShares, faceValue].some((value) => !Number.isFinite(value) || value <= 0)) {
        Alert.alert('Validation Error', 'Please enter authorized capital, subscribed capital, total shares, and face value.');
        return;
      }
      if (paidUp > authorized) {
        Alert.alert('Validation Error', 'Subscribed capital cannot exceed authorized capital.');
        return;
      }
    }

    // Validation for Step 5 (Documents & KYC Checklist)
    if (currentStep === 5) {
      const requiredIds = ['DIRECTOR_PAN', 'DIRECTOR_ID_PROOF', 'REGISTERED_OFFICE_PROOF', 'OFFICE_UTILITY_BILL'];
      const missingMandatory = requiredIds.some((id) => {
        const doc = draft.documents.find((d) => d.id === id);
        return !doc || doc.status !== 'Uploaded';
      });
      if (missingMandatory) {
        Alert.alert(
          'Validation Error',
          'Please upload all mandatory documents (PAN Card, Identity/Address Proof, Office Address Proof, and Office Utility Bill) before proceeding.'
        );
        return;
      }
    }

    if (currentStep < 8) {
      saveInFlight.current = true;
      setIsSaving(true);
      try {
        const accessToken = await tokenManager.getAccessToken();
        const authenticatedCustomerId = authenticatedUser?.customerId || customer?.customerId || null;
        const tokenCustomerId = accessToken ? JwtUtils.decodePayload(accessToken)?.sub : null;
        console.log('[CompanyRegistration] CURRENT USER', {
          customerId: authenticatedCustomerId,
        });
        console.log('[CompanyRegistration] JWT PRESENT', Boolean(accessToken));
        console.log('[CompanyRegistration] JWT CUSTOMER MATCH', Boolean(
          authenticatedCustomerId && tokenCustomerId === authenticatedCustomerId,
        ));
        console.log(
          currentStep === 0 && !draft.id
            ? '[CompanyRegistration] POST START'
            : '[CompanyRegistration] SAVE START',
          { step: currentStep, registrationId: draft.id || null },
        );
        const status = await saveCurrentStep(currentStep);
        const isCreateStep = currentStep === 0 && !draft.id;
        console.log(
          isCreateStep ? '[CompanyRegistration] POST STATUS' : '[CompanyRegistration] SAVE STATUS',
          status,
        );
        if (status !== 200 && status !== 201) {
          throw new Error(`Save returned unexpected status ${status}.`);
        }
        if (currentStep === 0) {
          const registrationId = useCompanyRegistrationStore.getState().draft.id;
          console.log('[CompanyRegistration] CREATED REGISTRATION ID', registrationId || null);
          if (!registrationId) {
            throw new Error('Company Registration ID missing from API response.');
          }
        }
        console.log(
          isCreateStep ? '[CompanyRegistration] POST SUCCESS' : '[CompanyRegistration] SAVE SUCCESS',
          { step: currentStep },
        );
        navigationStarted = true;
        console.log('[CompanyRegistration] NAVIGATION START', { nextStep: currentStep + 1 });
        setStep(currentStep + 1);
        console.log('[CompanyRegistration] NAVIGATION SUCCESS', {
          activeStep: useCompanyRegistrationStore.getState().draft.currentStep,
        });
      } catch (error: unknown) {
        console.error('[CompanyRegistration] ERROR', error);
        if (navigationStarted) {
          console.error('[CompanyRegistration] NAVIGATION ERROR', error);
        }
        Alert.alert('Save Error', formatSaveError(error));
      } finally {
        saveInFlight.current = false;
        setIsSaving(false);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepCompanyType />;
      case 1:
        return <StepCombinedDetails />;
      case 2:
        return <StepRegisteredOffice />;
      case 3:
        return <StepPromoters />;
      case 4:
        return <StepCapitalShareholding />;
      case 5:
        return <StepDocumentsKYC />;
      case 6:
        return <StepLinkedRegistrations />;
      case 7:
        return <StepReviewApplication onConfirm={handleReviewConfirm} isConfirming={isSaving} />;
      case 8:
        return <StepFeesPayment />;
      case 9:
        return <StepApplicationTracking />;
      case 10:
        return <StepSubmissionSuccess />;
      case 11:
        return <StepApplicationReceipt />;
      default:
        return <StepCompanyType />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Top Header */}
      <AppHeader title="Company Registration" showBack onBack={handleHeaderBack} />

      {/* Filling Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentStep + 1} / {totalSteps} screens completed
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Main Scroll Content with Keyboard Handling */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {isHydrating ? <ActivityIndicator size="large" color="#083B75" /> : renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Footer Navigation */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), justifyContent: 'flex-end' }]}>
        {(currentStep < 7 || currentStep === 9 || currentStep === 10) && (
          <TouchableOpacity style={[styles.nextBtn, (isHydrating || isSaving || pendingPersonRequests > 0) && { opacity: 0.65 }]} onPress={handleNext} activeOpacity={0.8} disabled={isHydrating || isSaving || pendingPersonRequests > 0}>
            {isSaving
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.nextBtnText}>{currentStep === 10 ? 'View Payment Receipt →' : 'Continue →'}</Text>}
          </TouchableOpacity>
        )}
      </View>

      <UniversalDraftModal
        visible={showDraftModal}
        title="Save Filing Progress?"
        message="You have unsaved changes in your application. Save your progress so you can resume anytime without re-entering details."
        saveButtonText="Save as Draft & Exit"
        discardButtonText="Discard & Exit"
        cancelButtonText="Keep Editing"
        onSaveAndExit={handleSaveAndExit}
        onDiscardAndExit={handleDiscardAndExit}
        onCancel={handleCancel}
      />
    </View>
  );
};

export default CompanyRegistrationScreen;
