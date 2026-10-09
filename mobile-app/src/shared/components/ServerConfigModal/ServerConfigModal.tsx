import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiClient } from "../../../core/api/apiClient";
import { API_TIMEOUT_MS } from "../../../core/api/apiConfig";
import { apiEndpoints } from "../../../core/api/apiEndpoints";
import { BrandColors } from "../../theme";
import {
  styles,
  getResultBadgeStyle,
  getResultTextStyle,
} from "./ServerConfigModal.styles";

export interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(
        `${apiClient.getBaseUrl()}${apiEndpoints.system.health}`,
        {
          signal: controller.signal,
        },
      );

      if (res.ok || res.status === 200 || res.status === 401 || res.status === 403) {
        setTestResult({ success: true, message: "Backend is reachable!" });
      } else {
        setTestResult({ success: false, message: `Server returned status ${res.status}` });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Cannot reach the configured backend. Check the API URL and network.",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsTesting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Ionicons name="server-outline" size={24} color={BrandColors.PRIMARY_BLUE} />
            <Text style={styles.title}>Backend Connection</Text>
          </View>

          <Text style={styles.description}>
            The backend URL is supplied by the app environment configuration:
          </Text>

          <Text
            style={styles.input}
            selectable
          >
            {apiClient.getBaseUrl()}
          </Text>

          {testResult && (
            <View style={[styles.resultBadge, getResultBadgeStyle(testResult.success)]}>
              <Ionicons
                name={testResult.success ? "checkmark-circle" : "close-circle"}
                size={16}
                color={testResult.success ? "#10B981" : "#EF4444"}
              />
              <Text style={[styles.resultText, getResultTextStyle(testResult.success)]}>
                {testResult.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTest}
            disabled={isTesting}
            activeOpacity={0.7}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color={BrandColors.PRIMARY_BLUE} />
            ) : (
              <Text style={styles.testBtnText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ServerConfigModal;
