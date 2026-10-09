import React from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export interface DocumentPreviewModalProps {
  visible: boolean;
  documentName?: string;
  fileUri?: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  documentName,
  fileUri,
  onClose,
}) => {
  const isImage = /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(fileUri || "");

  const openFile = async () => {
    if (!fileUri) return;
    try {
      await Linking.openURL(fileUri);
    } catch (error) {
      console.error("Unable to open the loan document.", error);
      Alert.alert("Preview Error", "This file could not be opened on this device.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
        }}
      >
        <View
          style={{
            overflow: "hidden",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
          }}
        >
          <View
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
            }}
          >
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "600" }}>
              {documentName || "Document preview"}
            </Text>
            <TouchableOpacity accessibilityLabel="Close preview" onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          {isImage && fileUri ? (
            <Image
              source={{ uri: fileUri }}
              resizeMode="contain"
              style={{ width: "100%", height: 420, backgroundColor: "#F1F5F9" }}
            />
          ) : (
            <View style={{ alignItems: "center", padding: 32 }}>
              <Ionicons name="document-text-outline" size={44} color="#64748B" />
              <Text style={{ marginTop: 12, color: "#475569", textAlign: "center" }}>
                Preview this file using an app on your device.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={openFile}
                style={{
                  marginTop: 20,
                  borderRadius: 8,
                  backgroundColor: "#EA580C",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Open document</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default DocumentPreviewModal;
