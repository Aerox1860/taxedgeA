import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const DOCUMENT_ICON_NAMES: readonly IoniconName[] = [
  "analytics",
  "briefcase",
  "camera",
  "card",
  "cash",
  "document-attach",
  "document-text",
  "document-text-outline",
  "finger-print",
  "folder",
  "home",
  "key",
  "map",
  "newspaper",
  "people",
  "receipt",
  "receipt-outline",
  "ribbon",
  "shield-checkmark",
  "stats-chart",
  "trending-up",
];

export function getDocumentIconName(iconName: string): IoniconName {
  return DOCUMENT_ICON_NAMES.find((name) => name === iconName) ?? "document-text-outline";
}
