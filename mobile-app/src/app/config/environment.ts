export interface EnvironmentConfig {
  apiUrl: string;
  environment: "development" | "staging" | "production";
  enableAnalytics: boolean;
  enableLogging: boolean;
  timeoutMs: number;
  ifscApiBaseUrl?: string;
  postalApiBaseUrl?: string;
  supportPhoneNumber?: string;
  supportWhatsAppBaseUrl?: string;
}

const normalizeApiUrl = (
  value: string | undefined,
  variableName = "EXPO_PUBLIC_API_BASE_URL",
): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing ${variableName}. Set it in mobile-app/.env to a backend base URL.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid ${variableName}. Provide an absolute HTTP or HTTPS URL.`,
    );
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `Invalid ${variableName}. Provide an absolute HTTP or HTTPS URL without credentials, query, or fragment.`,
    );
  }

  return trimmed.replace(/\/+$/, "");
};

const normalizeOptionalApiUrl = (
  value: string | undefined,
  variableName: string,
): string | undefined => {
  if (!value?.trim()) return undefined;
  return normalizeApiUrl(value, variableName);
};

const normalizeOptionalPhoneNumber = (
  value: string | undefined,
): string | undefined => {
  if (!value?.trim()) return undefined;
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    throw new Error(
      "Invalid EXPO_PUBLIC_SUPPORT_PHONE_NUMBER. Provide a phone number containing digits.",
    );
  }
  return digits;
};

const parseTimeout = (value: string | undefined): number => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_TIMEOUT_MS. Set it to a positive integer in milliseconds.",
    );
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      "Invalid EXPO_PUBLIC_API_TIMEOUT_MS. Set it to a positive integer in milliseconds.",
    );
  }
  const timeoutMs = Number(trimmed);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      "Invalid EXPO_PUBLIC_API_TIMEOUT_MS. Set it to a positive integer in milliseconds.",
    );
  }
  return timeoutMs;
};

const environment: EnvironmentConfig["environment"] =
  process.env.NODE_ENV === "production" ? "production" : "development";

export const Environment: EnvironmentConfig = {
  apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_BASE_URL),
  environment,
  enableAnalytics: process.env.NODE_ENV === "production",
  enableLogging: process.env.NODE_ENV !== "production",
  timeoutMs: parseTimeout(process.env.EXPO_PUBLIC_API_TIMEOUT_MS),
  ifscApiBaseUrl: normalizeOptionalApiUrl(
    process.env.EXPO_PUBLIC_IFSC_API_BASE_URL,
    "EXPO_PUBLIC_IFSC_API_BASE_URL",
  ),
  postalApiBaseUrl: normalizeOptionalApiUrl(
    process.env.EXPO_PUBLIC_POSTAL_API_BASE_URL,
    "EXPO_PUBLIC_POSTAL_API_BASE_URL",
  ),
  supportPhoneNumber: normalizeOptionalPhoneNumber(
    process.env.EXPO_PUBLIC_SUPPORT_PHONE_NUMBER,
  ),
  supportWhatsAppBaseUrl: normalizeOptionalApiUrl(
    process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_BASE_URL,
    "EXPO_PUBLIC_SUPPORT_WHATSAPP_BASE_URL",
  ),
};

export default Environment;
