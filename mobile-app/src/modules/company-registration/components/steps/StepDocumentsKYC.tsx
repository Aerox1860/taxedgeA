import React, { useRef, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { DocumentUploadBottomSheet } from '@/modules/itr/tds/components/upload/DocumentUploadBottomSheet/DocumentUploadBottomSheet';
import { TdsDocumentCard } from '@/modules/itr/tds/components/upload/TdsDocumentCard/TdsDocumentCard';
import { TdsChecklistItem } from '@/modules/itr/tds/types/checklist.types';
import { DocumentPreviewModal } from '@/modules/itr/itr-filing/components/DocumentPreviewModal/DocumentPreviewModal';
import { ItrDocumentItem } from '@/modules/itr/itr-filing/types/itrFiling.types';
import { useCompanyRegistrationStore } from '../../store/companyRegistrationSlice';
import { companyRegistrationApi } from '../../services/companyRegistrationApi';
import type { CompanyDocumentType } from '../../types/registration.types';
import { styles } from './StepDocumentsKYC.styles';

export interface KycChecklistItem {
  id: CompanyDocumentType;
  title: string;
  subtitle: string;
  section: 'PROMOTER / DIRECTOR KYC' | 'REGISTERED OFFICE' | 'STATUTORY DOCUMENTS';
  required: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
}

const blobToDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to prepare the downloaded document for preview.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read the downloaded document.'));
    reader.readAsDataURL(blob);
  });

const CHECKLIST_ITEMS: KycChecklistItem[] = [
  // PROMOTER / DIRECTOR KYC
  {
    id: 'DIRECTOR_PAN',
    title: 'PAN Card *',
    subtitle: 'Promoter KYC',
    section: 'PROMOTER / DIRECTOR KYC',
    required: true,
    iconName: 'card-outline',
  },
  {
    id: 'DIRECTOR_ID_PROOF',
    title: 'Identity / Address Proof *',
    subtitle: 'Aadhaar / Passport / other applicable proof',
    section: 'PROMOTER / DIRECTOR KYC',
    required: true,
    iconName: 'id-card-outline',
  },
  // REGISTERED OFFICE
  {
    id: 'REGISTERED_OFFICE_PROOF',
    title: 'Office Address Proof *',
    subtitle: 'Lease / Rent Agreement / Ownership Proof',
    section: 'REGISTERED OFFICE',
    required: true,
    iconName: 'business-outline',
  },
  {
    id: 'OFFICE_UTILITY_BILL',
    title: 'Office Utility Bill *',
    subtitle: 'Electricity / Water / applicable utility bill',
    section: 'REGISTERED OFFICE',
    required: true,
    iconName: 'receipt-outline',
  },
  {
    id: 'PROPERTY_OWNER_NOC',
    title: 'Owner NOC',
    subtitle: 'Required only if applicable',
    section: 'REGISTERED OFFICE',
    required: false,
    iconName: 'document-attach-outline',
  },

];

export const StepDocumentsKYC: React.FC = () => {
  const applicationId = useCompanyRegistrationStore((state) => state.draft.id);
  const storedDocs = useCompanyRegistrationStore((state) => state.draft.documents);
  const uploadRegistrationDocument = useCompanyRegistrationStore((state) => state.uploadRegistrationDocument);
  const removeRegistrationDocument = useCompanyRegistrationStore((state) => state.removeRegistrationDocument);

  const [activeItem, setActiveItem] = useState<KycChecklistItem | null>(null);
  const [previewItem, setPreviewItem] = useState<ItrDocumentItem | null>(null);
  const documentRequestInFlight = useRef(false);

  const handleDocumentSelected = async (
    fileName: string,
    fileUri?: string,
    mimeType?: string,
    fileSize?: number,
  ) => {
    if (!activeItem || !fileUri || documentRequestInFlight.current) return;
    documentRequestInFlight.current = true;
    try {
      await uploadRegistrationDocument({
        id: activeItem.id,
        name: activeItem.title.replace('*', '').trim(),
        category: activeItem.section,
        required: activeItem.required,
        status: 'Uploaded',
        fileUri,
        fileName,
        mimeType,
        fileSize,
      });
      setActiveItem(null);
    } catch (error: any) {
      Alert.alert('Upload Error', error?.message || 'Unable to upload the selected document.');
    } finally {
      documentRequestInFlight.current = false;
    }
  };

  const handlePickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        handleDocumentSelected(asset.name, asset.uri, asset.mimeType, asset.size);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Failed to select document.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to select photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const name = asset.fileName || `photo_${Date.now()}.jpg`;
        handleDocumentSelected(name, asset.uri, asset.mimeType, asset.fileSize);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Failed to select image from gallery.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take document photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const name = asset.fileName || `camera_${Date.now()}.jpg`;
        handleDocumentSelected(name, asset.uri, asset.mimeType, asset.fileSize);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Failed to take photo.');
    }
  };

  const handleRemoveDocument = async (docId: CompanyDocumentType) => {
    if (documentRequestInFlight.current) return;
    documentRequestInFlight.current = true;
    try {
      await removeRegistrationDocument(docId);
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Unable to remove the selected document.');
    } finally {
      documentRequestInFlight.current = false;
    }
  };


  const sections: ('PROMOTER / DIRECTOR KYC' | 'REGISTERED OFFICE' | 'STATUTORY DOCUMENTS')[] = [
    'PROMOTER / DIRECTOR KYC',
    'REGISTERED OFFICE',
    'STATUTORY DOCUMENTS',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Documents & KYC Checklist</Text>
      <Text style={styles.subheading}>
        Upload digital copies of promoter identity, office proofs, and statutory e-MoA/e-AoA drafts.
      </Text>

      {sections.map((sectionName) => {
        const sectionItems = CHECKLIST_ITEMS.filter((item) => item.section === sectionName);
        if (sectionItems.length === 0) return null;

        return (
          <View key={sectionName}>
            <Text style={styles.sectionTitle}>{sectionName}</Text>

            {sectionItems.map((item) => {
              const stored = storedDocs.find((d) => d.id === item.id);
              const isUploaded = stored?.status === 'Uploaded';
              const displayFileName = stored?.fileName || (stored?.fileUri ? stored.fileUri.split('/').pop() : '');
              const displayFileSize = stored?.fileSize
                ? `${(stored.fileSize / (1024 * 1024)).toFixed(1)} MB`
                : undefined;

              const tdsItem: TdsChecklistItem = {
                id: item.id,
                title: item.title.replace('*', '').trim(),
                subtitle: item.subtitle,
                status: isUploaded ? 'uploaded' : 'not_uploaded',
                isMandatory: item.required,
                fileName: displayFileName || undefined,
                fileUri: stored?.fileUri || (isUploaded ? `server-document:${stored.documentId ?? stored.id}` : undefined),
                fileSize: displayFileSize,
                mimeType: stored?.mimeType,
                uploadedAt: stored?.uploadedAt,
                isVisible: true,
              };

              return (
                <View key={item.id} style={{ marginBottom: 12 }}>
                  <TdsDocumentCard
                    item={tdsItem}
                    onUploadPress={() => setActiveItem(item)}
                    onChange={() => setActiveItem(item)}
                    onDelete={() => handleRemoveDocument(item.id)}
                    onView={async () => {
                      if (!stored?.documentId || !applicationId) {
                        Alert.alert('Document Unavailable', 'The saved document reference is missing. Please upload the document again.');
                        return;
                      }
                      try {
                        const blob = await companyRegistrationApi.downloadDocument(applicationId, stored.documentId);
                        const fileUri = await blobToDataUri(blob);
                        setPreviewItem({
                          id: item.id,
                          name: item.title.replace('*', '').trim(),
                          subtitle: item.subtitle,
                          tier: item.required ? 'REQUIRED' : 'NOT_REQUIRED',
                          required: item.required,
                          docGroup: 'common',
                          fileUri,
                          fileName: displayFileName,
                          fileSize: displayFileSize,
                          mimeType: stored.mimeType,
                          uploadedAt: stored.uploadedAt,
                        });
                      } catch (error: unknown) {
                        Alert.alert(
                          'Document Preview Error',
                          error instanceof Error ? error.message : 'Unable to load the saved document.',
                        );
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Reused ITR Document Upload Bottom Sheet */}
      <DocumentUploadBottomSheet
        visible={!!activeItem}
        documentTitle={activeItem?.title.replace('*', '').trim()}
        onClose={() => setActiveItem(null)}
        onCancel={() => setActiveItem(null)}
        onPickFiles={handlePickFiles}
        onPickGallery={handlePickGallery}
        onTakePhoto={handleTakePhoto}
      />

      <DocumentPreviewModal
        visible={!!previewItem}
        document={previewItem}
        onClose={() => setPreviewItem(null)}
        onChangeFile={(doc) => {
          setPreviewItem(null);
          const originalItem = CHECKLIST_ITEMS.find(i => i.id === doc.id);
          if (originalItem) setActiveItem(originalItem);
        }}
      />
    </View>
  );
};
