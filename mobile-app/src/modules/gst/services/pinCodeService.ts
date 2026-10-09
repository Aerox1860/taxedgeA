import { Environment } from "../../../app/config/environment";
import { API_TIMEOUT_MS } from "../../../core/api/apiConfig";
import { apiEndpoints } from "../../../core/api/apiEndpoints";

export interface PinCodeDetails {
  city: string;
  district: string;
  state: string;
}

interface PostalOffice {
  District?: string;
  State?: string;
  Block?: string;
  Name?: string;
}

interface PostalApiResponse {
  Status?: string;
  Message?: string;
  PostOffice?: PostalOffice[] | null;
}

const PIN_CODE_PATTERN = /^\d{6}$/;

export const pinCodeService = {
  lookup: async (pinCode: string): Promise<PinCodeDetails> => {
    const cleanPin = pinCode.trim();
    if (!PIN_CODE_PATTERN.test(cleanPin)) {
      throw new Error("Please enter a valid 6-digit Indian PIN code.");
    }
    if (!Environment.postalApiBaseUrl) {
      throw new Error(
        "Postal-code lookup is not configured. Please fill in the location manually.",
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(
        `${Environment.postalApiBaseUrl}${apiEndpoints.external.postalCodeLookup(cleanPin)}`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      throw new Error("PIN code lookup is unavailable. Please fill in the location manually.");
    }

    const results = (await response.json()) as PostalApiResponse[];
    const firstResult = results[0];
    const firstOffice = firstResult?.PostOffice?.find(
      (office) => office.District && office.State
    );
    if (firstResult?.Status !== "Success" || !firstOffice) {
      throw new Error(firstResult?.Message || "No location was found for this PIN code.");
    }

    return {
      city: firstOffice.Block || firstOffice.Name || firstOffice.District || "",
      district: firstOffice.District || "",
      state: firstOffice.State || "",
    };
  },
};

export default pinCodeService;
