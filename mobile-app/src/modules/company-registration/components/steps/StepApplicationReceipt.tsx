import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { companyRegistrationApi } from '../../services/companyRegistrationApi';
import { styles } from './StepApplicationReceipt.styles';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

export const StepApplicationReceipt: React.FC = () => {
  const draft = useCompanyRegistrationStore((state) => state.draft);
  const saveWorkflowProgress = useCompanyRegistrationStore((state) => state.saveWorkflowProgress);
  const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof companyRegistrationApi.receipt>> | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const isLoading = Boolean(draft.id) && isLoadingRequest;

  useEffect(() => {
    if (!draft.id) return;
    let isCurrent = true;
    companyRegistrationApi.receipt(draft.id)
      .then(async (savedReceipt) => {
        if (savedReceipt.payment?.paymentStatus?.toUpperCase() !== 'PAID') {
          if (isCurrent) {
            setReceiptError('Payment has not been confirmed. A receipt is available after successful payment.');
          }
          return;
        }
        await saveWorkflowProgress(12);
        if (isCurrent) {
          setReceiptError(null);
          setReceipt(savedReceipt);
        }
      })
      .catch((error: any) => {
        if (isCurrent) {
          const message = error?.message || 'Unable to load the saved receipt.';
          setReceiptError(message);
          Alert.alert('Receipt Error', message);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingRequest(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [draft.id, saveWorkflowProgress]);

  const payment = receipt?.payment;
  const applicationReference = receipt?.applicationNumber || String(receipt?.applicationId || draft.id || 'Not available');
  const appliedDate = receipt?.submittedAt
    ? new Date(receipt.submittedAt).toLocaleDateString('en-IN')
    : 'Not submitted';

  const handleDownloadPdf = async () => {
    if (!receipt) {
      Alert.alert('Receipt Unavailable', 'Load the saved receipt before downloading it.');
      return;
    }

    const companyName = draft.company.proposedName1 || 'Not provided';
    const transactionId = payment?.transactionId || 'Not available';
    const totalAmount = Number(payment?.totalAmount ?? draft.feeBreakdown.totalAmount);
    try {
      const { uri } = await Print.printToFileAsync({
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 32px; color: #1e293b;">
              <h1>TaxEdge Fin Solutions</h1>
              <h2>Company Registration Receipt</h2>
              <p><strong>Application reference:</strong> ${escapeHtml(applicationReference)}</p>
              <p><strong>Company name:</strong> ${escapeHtml(companyName)}</p>
              <p><strong>Company type:</strong> ${escapeHtml(receipt.companyType)}</p>
              <p><strong>Submitted:</strong> ${escapeHtml(appliedDate)}</p>
              <p><strong>Transaction ID:</strong> ${escapeHtml(transactionId)}</p>
              <p><strong>Payment status:</strong> ${escapeHtml(payment?.paymentStatus || 'Pending')}</p>
              <p><strong>Total amount:</strong> INR ${totalAmount.toLocaleString('en-IN')}</p>
              <p><strong>Application status:</strong> ${escapeHtml(receipt.status)}</p>
            </body>
          </html>
        `,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('PDF Created', `The receipt PDF is available at ${uri}.`);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Company Registration Receipt',
      });
    } catch (error: unknown) {
      Alert.alert(
        'Receipt Error',
        error instanceof Error ? error.message : 'Unable to create the receipt PDF.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>TaxEdge Application & Payment Receipt</Text>
      <Text style={styles.subheading}>This receipt summarizes your TaxEdge application and the payment status recorded by the backend.</Text>

      {isLoading ? <ActivityIndicator accessibilityLabel="Loading receipt" /> : null}
      {receiptError ? (
        <View style={styles.receiptPaper}>
          <Text style={styles.dataValue}>{receiptError}</Text>
        </View>
      ) : null}

      {/* Printable Receipt Paper Card */}
      {receipt ? <View style={styles.receiptPaper}>
        <View style={styles.logoRow}>
          <View>
            <Text style={styles.brandName}>TaxEdge Fin Solutions</Text>
            <Text style={styles.brandSub}>Corporate Incorporation Desk</Text>
          </View>
          <Text style={styles.receiptTitle}>RECEIPT</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Application Reference ID</Text>
          <Text style={styles.dataValue}>{applicationReference}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Proposed Company Name</Text>
          <Text style={styles.dataValue}>{draft.company.proposedName1 || 'Not provided'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Company Legal Structure</Text>
          <Text style={styles.dataValue}>{receipt?.companyType || draft.company.companyType}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Application Date</Text>
          <Text style={styles.dataValue}>{appliedDate}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Transaction ID</Text>
          <Text style={styles.dataValue}>{payment?.transactionId || 'Not available'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Payment Mode</Text>
          <Text style={styles.dataValue}>{payment?.paymentMethod || 'Not available'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataRow}>
          <Text style={[styles.dataLabel, { fontWeight: '700' }]}>Total Amount</Text>
          <Text style={[styles.dataValue, { fontSize: 16, color: '#083B75' }]}>
            ₹{Number(payment?.totalAmount ?? draft.feeBreakdown.totalAmount).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={[styles.dataRow, { marginTop: 6 }]}>
          <Text style={styles.dataLabel}>Payment Status</Text>
          <View style={styles.paidBadge}>
            <Text style={styles.paidText}>{payment?.paymentStatus || draft.paymentStatus}</Text>
          </View>
        </View>
      </View> : null}

      {/* Download PDF Action */}
      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={handleDownloadPdf}
        activeOpacity={0.8}
        disabled={!receipt || isLoading}
      >
        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
        <Text style={styles.downloadBtnText}>Download PDF Receipt</Text>
      </TouchableOpacity>
    </View>
  );
};
