import React from "react";
import { View, Text, TouchableOpacity, Alert, Linking, ViewStyle } from "react-native";
import { Environment } from "../../../../../../app/config/environment";
import { styles } from "./TdsContactSupportFooter.styles";

interface TdsContactSupportFooterProps {
  style?: ViewStyle;
  onPressSupport?: () => void;
}

export const TdsContactSupportFooter: React.FC<TdsContactSupportFooterProps> = ({
  style,
  onPressSupport,
}) => {
  const handleSupportPress = () => {
    if (onPressSupport) {
      onPressSupport();
      return;
    }

    const phoneNumber = Environment.supportPhoneNumber;
    const whatsAppBaseUrl = Environment.supportWhatsAppBaseUrl;
    const actions = [
      ...(phoneNumber
        ? [{
            text: "Call Support",
            onPress: () => Linking.openURL(`tel:${phoneNumber}`).catch(() => {}),
          }]
        : []),
      ...(phoneNumber && whatsAppBaseUrl
        ? [{
            text: "WhatsApp Chat",
            onPress: () => {
              const url = new URL(encodeURIComponent(phoneNumber), `${whatsAppBaseUrl}/`);
              Linking.openURL(url.toString()).catch(() => {});
            },
          }]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];
    Alert.alert(
      "Contact Support",
      phoneNumber
        ? "Our dedicated CA assistance team is available 9 AM - 8 PM IST."
        : "Support contact details are not configured.",
      actions,
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSupportPress}
        style={styles.supportButton}
      >
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TdsContactSupportFooter;
