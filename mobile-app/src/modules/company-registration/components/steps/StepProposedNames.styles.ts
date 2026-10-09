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
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#083B75',
  },
  statusDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 4,
  },
  nameCheckResult: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  checkButton: {
    backgroundColor: '#083B75',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    marginBottom: 12,
  },
  checkButtonDisabled: {
    opacity: 0.7,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
  suffixBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  suffixText: {
    fontSize: 12,
    color: '#083B75',
    fontWeight: '600',
  },
});
