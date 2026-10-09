import { Environment } from "../../app/config/environment";

export const API_BASE_URL = Environment.apiUrl;
export const API_TIMEOUT_MS = Environment.timeoutMs;

export const getDefaultBaseUrl = (): string => API_BASE_URL;
