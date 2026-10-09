import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { companyRegistrationApi } from '../../services/companyRegistrationApi';
import { styles } from './StepFeesPayment.styles';

const PAYMENT_METHODS = [
  { id: 'UPI', title: 'UPI (GPay / PhonePe / Paytm / BHIM)', icon: 'qr-code-outline' },
  { id: 'Card', title: 'Credit / Debit Card', icon: 'card-outline' },
  { id: 'NetBanking', title: 'Net Banking (All Indian Banks)', icon: 'business-outline' },
];

export const StepFeesPayment: React.FC = () => {
  const feeBreakdown = useCompanyRegistrationStore((state) => state.draft.feeBreakdown);
  const draft = useCompanyRegistrationStore((state) => state.draft);
  const setStep = useCompanyRegistrationStore((state) => state.setStep);
  const hydrateFromBackend = useCompanyRegistrationStore((state) => state.hydrateFromBackend);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const submitInFlight = useRef(false);

  const handlePay = async () => {
    if (isSubmitting || submitInFlight.current) return;
    if (!draft.id) {
      Alert.alert('Submission Error', 'Save the registration before submitting payment.');
      return;
    }
    submitInFlight.current = true;
    setIsSubmitting(true);

    try {
      if (!submissionComplete) {
        const payment = await companyRegistrationApi.savePayment(draft.id, {
          amount: feeBreakdown.totalAmount,
          governmentFee: feeBreakdown.statutoryCharges,
          professionalFee: feeBreakdown.professionalFee,
          totalAmount: feeBreakdown.totalAmount,
          paymentStatus: 'PENDING',
          paymentMethod: selectedMethod,
        });
        if (payment.status !== 200 && payment.status !== 201) {
          throw new Error(`Payment save returned unexpected status ${payment.status}.`);
        }
        const submission = await companyRegistrationApi.submitRegistration(draft.id);
        if (submission.status !== 200 && submission.status !== 201) {
          throw new Error(`Application submit returned unexpected status ${submission.status}.`);
        }
        setSubmissionComplete(true);
      }
      await hydrateFromBackend(draft.id);
      setStep(9);
    } catch (error: unknown) {
      Alert.alert(
        'Submission Error',
        error instanceof Error ? error.message : 'Unable to submit company registration.',
      );
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Fees & Payment Breakdown</Text>
      <Text style={styles.subheading}>
        Review the estimated fees and submit your application. Online payment is not currently
        available; the backend will keep payment status pending.
      </Text>

      {/* Fee Itemization Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>TaxEdge Professional Fee</Text>
          <Text style={styles.value}>₹{feeBreakdown.professionalFee.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GST (18%)</Text>
          <Text style={styles.value}>₹{feeBreakdown.gstAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Estimated / Applicable MCA Statutory Charges</Text>
          <Text style={styles.value}>₹{feeBreakdown.statutoryCharges.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total Payable Amount</Text>
          <Text style={styles.totalValue}>₹{feeBreakdown.totalAmount.toLocaleString('en-IN')}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 16 }}>
        * ₹1,500 represents estimated / applicable MCA government filing fee and stamp duty charges.
      </Text>

      {/* Payment Method Selection */}
      <Text style={[styles.label, { fontWeight: '700', marginBottom: 8 }]}>Preferred Payment Method</Text>
      {PAYMENT_METHODS.map((m) => {
        const isSelected = selectedMethod === m.id;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodCard, isSelected && styles.methodCardSelected]}
            onPress={() => setSelectedMethod(m.id)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={m.icon as any} size={22} color={isSelected ? '#083B75' : '#64748B'} />
              <Text style={styles.methodTitle}>{m.title}</Text>
            </View>
            <Ionicons
              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={isSelected ? '#083B75' : '#94A3B8'}
            />
          </TouchableOpacity>
        );
      })}

      {/* Pay CTA */}
      <TouchableOpacity 
        style={[styles.payBtn, isSubmitting && { opacity: 0.7 }]} 
        onPress={handlePay} 
        activeOpacity={0.8}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.payBtnText}>Submit Application (Payment Pending)</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
