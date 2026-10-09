import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { DocumentUploadBottomSheetProps } from "../../../shared/components/DocumentUploadBottomSheet";
import type { LoanDocumentItem } from "../types/loans.types";

export interface LoanDocuments {
  documents: LoanDocumentItem[];
  progress: {
    uploadedRequired: number;
    totalRequired: number;
    requiredPercent: number;
  };
  openUpload: (documentId: string) => void;
  removeDocument: (documentId: string) => void;
  openPreview: (documentId: string) => void;
  uploadSheetProps: DocumentUploadBottomSheetProps;
  previewModalProps: {
    visible: boolean;
    documentName?: string;
    fileUri?: string;
    onClose: () => void;
  };
}

interface UseLoanDocumentsOptions {
  template: LoanDocumentItem[];
}

function formatFileSize(size?: number): string | undefined {
  if (size === undefined || !Number.isFinite(size)) return undefined;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function useLoanDocuments({ template }: UseLoanDocumentsOptions): LoanDocuments {
  const [documents, setDocuments] = useState<LoanDocumentItem[]>(() =>
    template.map((document) => ({ ...document }))
  );
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [isUploadSheetVisible, setIsUploadSheetVisible] = useState(false);

  const activeDocument = documents.find((document) => document.id === activeDocumentId);
  const previewDocument = documents.find((document) => document.id === previewDocumentId);

  const closeUploadSheet = useCallback(() => {
    setIsUploadSheetVisible(false);
    setActiveDocumentId(null);
  }, []);

  const saveUpload = useCallback((uri: string, name?: string, size?: number) => {
    if (!activeDocumentId) return;
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === activeDocumentId
          ? {
              ...document,
              fileUri: uri,
              fileName: name || "Uploaded document",
              fileSize: formatFileSize(size),
              uploadedAt: new Date().toISOString(),
            }
          : document
      )
    );
    closeUploadSheet();
  }, [activeDocumentId, closeUploadSheet]);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      saveUpload(file.uri, file.name, file.size);
    } catch (error) {
      console.error("Unable to select a loan document.", error);
      Alert.alert("Upload Error", "The document could not be selected. Please try again.");
    }
  }, [saveUpload]);

  const pickGalleryImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const image = result.assets[0];
      saveUpload(image.uri, image.fileName || image.uri.split("/").pop(), image.fileSize);
    } catch (error) {
      console.error("Unable to select an image for a loan document.", error);
      Alert.alert("Upload Error", "The image could not be selected. Please try again.");
    }
  }, [saveUpload]);

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera Permission Required", "Allow camera access to photograph a document.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const image = result.assets[0];
      saveUpload(image.uri, image.fileName || image.uri.split("/").pop(), image.fileSize);
    } catch (error) {
      console.error("Unable to capture a loan document.", error);
      Alert.alert("Upload Error", "The document photo could not be captured. Please try again.");
    }
  }, [saveUpload]);

  const openUpload = useCallback((documentId: string) => {
    if (!documents.some((document) => document.id === documentId)) return;
    setActiveDocumentId(documentId);
    setIsUploadSheetVisible(true);
  }, [documents]);

  const removeDocument = useCallback((documentId: string) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) => {
        if (document.id !== documentId) return document;
        const { fileUri, fileName, fileSize, uploadedAt, ...unuploadedDocument } = document;
        return unuploadedDocument;
      })
    );
  }, []);

  const openPreview = useCallback((documentId: string) => {
    if (!documents.some((document) => document.id === documentId && document.fileUri)) return;
    setPreviewDocumentId(documentId);
  }, [documents]);

  const closePreview = useCallback(() => setPreviewDocumentId(null), []);

  const progress = useMemo(() => {
    const requiredDocuments = documents.filter((document) => document.required);
    const uploadedRequired = requiredDocuments.filter((document) => document.fileUri).length;
    return {
      uploadedRequired,
      totalRequired: requiredDocuments.length,
      requiredPercent: requiredDocuments.length
        ? Math.round((uploadedRequired / requiredDocuments.length) * 100)
        : 0,
    };
  }, [documents]);

  const uploadSheetProps: DocumentUploadBottomSheetProps = {
    visible: isUploadSheetVisible,
    documentTitle: activeDocument?.name,
    onClose: closeUploadSheet,
    onPickFiles: pickFile,
    onPickGallery: pickGalleryImage,
    onTakePhoto: takePhoto,
  };

  return {
    documents,
    progress,
    openUpload,
    removeDocument,
    openPreview,
    uploadSheetProps,
    previewModalProps: {
      visible: Boolean(previewDocument),
      documentName: previewDocument?.fileName || previewDocument?.name,
      fileUri: previewDocument?.fileUri,
      onClose: closePreview,
    },
  };
}

export default useLoanDocuments;
