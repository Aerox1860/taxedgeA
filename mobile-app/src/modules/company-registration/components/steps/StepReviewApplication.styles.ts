import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#083B75',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#083B75',
  },
  editBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  dataLabel: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  nestedCard: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  nestedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  documentStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  uploadedStatus: {
    color: '#166534',
  },
  pendingStatus: {
    color: '#B45309',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#083B75',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
  },
  confirmButton: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
