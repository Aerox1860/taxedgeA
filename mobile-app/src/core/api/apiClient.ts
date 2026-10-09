import { ApiError } from "./apiError";
import { InterceptorManager } from "./interceptors";
import { tokenRefreshManager } from "../authentication/tokenRefreshManager";
import { tokenManager } from "../authentication/tokenManager";
import { API_BASE_URL, API_TIMEOUT_MS } from "./apiConfig";
import { apiEndpoints } from "./apiEndpoints";

export {
  API_BASE_URL,
  API_TIMEOUT_MS,
} from "./apiConfig";

/**
 * Paths that should NEVER trigger a silent refresh on 401.
 * These are the auth endpoints themselves — retrying them would cause infinite loops.
 */
const NO_REFRESH_PATHS = [
  apiEndpoints.auth.refresh,
  apiEndpoints.auth.revoke,
  apiEndpoints.auth.validate,
  apiEndpoints.otp.generate,
  apiEndpoints.otp.verify,
  apiEndpoints.customer.login,
  apiEndpoints.customer.register,
];

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFieldErrors = (value: unknown): value is Record<string, string[]> =>
  isRecord(value) &&
  Object.values(value).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === "string"),
  );

const normalizeFieldErrors = (value: unknown): Record<string, string[]> | undefined => {
  if (isFieldErrors(value)) return value;
  if (!Array.isArray(value)) return undefined;

  const errors: Record<string, string[]> = {};
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.field !== "string" || typeof entry.message !== "string") {
      return undefined;
    }
    errors[entry.field] = [...(errors[entry.field] || []), entry.message];
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
};

export class ApiClient {
  public interceptors: InterceptorManager;

  constructor() {
    this.interceptors = new InterceptorManager();
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async ensureBaseUrlLoaded(): Promise<string> {
    return API_BASE_URL;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${API_BASE_URL}${cleanPath}`;

    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }
    const query = Object.entries(params)
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    return fullUrl.includes("?")
      ? `${fullUrl}&${query}`
      : `${fullUrl}?${query}`;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async getWithStatus<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<{ status: number; data: T }> {
    return this.requestWithStatus<T>("GET", path, undefined, options);
  }

  async getBlob(path: string, options?: RequestOptions): Promise<Blob> {
    try {
      await this.ensureBaseUrlLoaded();
      const config = await this.interceptors.runRequestInterceptors({
        url: this.buildUrl(path, options?.params),
        headers: { Accept: "*/*", ...(options?.headers || {}) },
        method: "GET",
      });
      const fetchFile = async (headers: Record<string, string>) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        try {
          return await fetch(config.url, {
            method: "GET",
            headers,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };
      let response = await fetchFile(config.headers);
      if (response.status === 401 && !this.isAuthEndpoint(path)) {
        const refreshed = await tokenRefreshManager.attemptRefresh();
        if (refreshed) {
          const accessToken = await tokenManager.getAccessToken();
          const retryHeaders = { ...config.headers };
          if (accessToken) retryHeaders.Authorization = `Bearer ${accessToken}`;
          response = await fetchFile(retryHeaders);
        }
      }
      if (!response.ok) {
        let message = response.statusText || "Document download failed";
        try {
          const errorBody: unknown = await response.json();
          if (isRecord(errorBody) && typeof errorBody.message === "string") {
            message = errorBody.message;
          }
        } catch {
          message = response.statusText || message;
        }
        throw new ApiError(message, response.status, "DOCUMENT_DOWNLOAD_FAILED");
      }
      return await response.blob();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const message = error instanceof Error ? error.message : "Document download failed";
      throw new ApiError(message, 500, "DOCUMENT_DOWNLOAD_FAILED");
    }
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async postWithStatus<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<{ status: number; data: T }> {
    return this.requestWithStatus<T>("POST", path, body, options);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  async putWithStatus<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<{ status: number; data: T }> {
    return this.requestWithStatus<T>("PUT", path, body, options);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  /**
  * A 401 for a protected request ends the current session; users must log in again.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const response = await this.requestWithStatus<T>(method, path, body, options);
    return response.data;
  }

  private async requestWithStatus<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<{ status: number; data: T }> {
    try {
      await this.ensureBaseUrlLoaded();
      const initialUrl = this.buildUrl(path, options?.params);
      const initialHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options?.headers || {}),
      };

      if (body instanceof FormData) {
        delete initialHeaders["Content-Type"];
      }

      const interceptedConfig = await this.interceptors.runRequestInterceptors({
        url: initialUrl,
        headers: initialHeaders,
        method,
      });

      if (__DEV__) {
        console.log(
          `🌐 [API] ${interceptedConfig.method} ${interceptedConfig.url}`,
        );
      }

      const fetchResponse = async (headers: Record<string, string>): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        try {
          const fetchBody =
            body === undefined
              ? undefined
              : body instanceof FormData
                ? body
                : JSON.stringify(body);
          return await fetch(interceptedConfig.url, {
            method: interceptedConfig.method,
            headers,
            body: fetchBody,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      let response = await fetchResponse(interceptedConfig.headers);
      if (response.status === 401 && !this.isAuthEndpoint(path)) {
        const refreshed = await tokenRefreshManager.attemptRefresh();
        if (refreshed) {
          const accessToken = await tokenManager.getAccessToken();
          const retryHeaders = { ...interceptedConfig.headers };
          if (accessToken) {
            retryHeaders.Authorization = `Bearer ${accessToken}`;
          }
          response = await fetchResponse(retryHeaders);
        }
      }

      if (__DEV__) {
        console.log(
          `🌐 [API] Response status: ${response.status} for ${interceptedConfig.url}`,
        );
      }

      if (!response.ok) {
        let errorData: unknown = {};
        try {
          const errText = await response.text();
          try {
            errorData = JSON.parse(errText) as unknown;
          } catch {
            errorData = { message: errText || response.statusText };
          }
        } catch {
          errorData = { message: response.statusText };
        }
        const errorBody = isRecord(errorData) ? errorData : {};
        const message =
          (typeof errorBody.message === "string" && errorBody.message) ||
          (typeof errorBody.error === "string" && errorBody.error) ||
          response.statusText ||
          "Request failed";
        const fieldErrors = normalizeFieldErrors(errorBody.errors);
        const detailedMessage = fieldErrors
          ? `${message}: ${Object.entries(fieldErrors)
              .flatMap(([field, messages]) => messages.map((fieldMessage) => `${field}: ${fieldMessage}`))
              .join("; ")}`
          : message;
        const apiError = new ApiError(
          detailedMessage,
          response.status,
          typeof errorBody.code === "string" ? errorBody.code : "API_ERROR",
          fieldErrors,
        );
        apiError.responseBody = errorData;

        throw apiError;
      }

      const rawText = await response.text();
      let responseData: T;
      try {
        responseData = JSON.parse(rawText) as T;
      } catch {
        // Plain text response from backend (e.g. "OTP sent successfully")
        responseData = rawText as T;
      }
      const data = await this.interceptors.runResponseInterceptors<T>(responseData);
      return { status: response.status, data };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      let errMessage = error instanceof Error ? error.message : "Request failed";
      const causeName = error instanceof Error ? error.name : "UnknownError";
      const causeMessage = errMessage;
      if (
        errMessage.includes("canceled") ||
        errMessage.includes("aborted") ||
        errMessage.includes("Network request failed") ||
        errMessage.includes("fetch failed")
      ) {
        errMessage =
          "Unable to connect to server. Please check your internet connection.";
      }
      const apiError = new ApiError(errMessage, 500, "NETWORK_ERROR");
      apiError.httpStatus = undefined;
      apiError.causeName = causeName;
      apiError.causeMessage = causeMessage;
      return this.interceptors.runErrorInterceptors(apiError);
    }
  }

  /**
   * Returns true if the given path is an auth/public endpoint that should
   * NEVER trigger a silent refresh (to prevent infinite loops).
   */
  private isAuthEndpoint(path: string): boolean {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return NO_REFRESH_PATHS.some((p) => cleanPath.startsWith(p));
  }
}

export const apiClient = new ApiClient();

apiClient.interceptors.useRequest(async (config) => {
  const requestPath = new URL(config.url).pathname;
  const isAuthEndpoint = NO_REFRESH_PATHS.some((path) => requestPath.startsWith(path));
  const accessToken = await tokenManager.getAccessToken();
  if (accessToken && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default apiClient;
