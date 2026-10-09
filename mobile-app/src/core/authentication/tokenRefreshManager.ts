import { tokenManager } from "../authentication/tokenManager";
import { API_BASE_URL, API_TIMEOUT_MS } from "../api/apiConfig";
import { apiEndpoints } from "../api/apiEndpoints";

/**
 * Backend response shape returned by the refresh endpoint.
 */
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

/**
 * Listener invoked when silent refresh fails irrecoverably.
 * The app should clear auth state and redirect to login.
 */
type SessionExpiredListener = () => void;

/**
 * TokenRefreshManager — production-grade silent token refresh.
 *
 * Key design decisions:
 *  1. Uses raw `fetch()` — NOT apiClient — to call the refresh endpoint.
 *     This avoids the Bearer-token request interceptor attaching the expired
 *     access token, and avoids infinite 401→refresh→401 loops.
 *
 *  2. Mutex via `refreshPromise` — if 5 API calls all get 401 at the same time,
 *     only ONE refresh call is made. The other 4 await the same Promise.
 *
 *  3. `onSessionExpired` callback — when the refresh token itself is expired or
 *     revoked, the manager notifies the app to redirect to login instead of
 *     silently failing forever.
 */
class TokenRefreshManager {
  /** The in-flight refresh promise (null when idle). Acts as a mutex. */
  private refreshPromise: Promise<boolean> | null = null;

  /** Callback fired when refresh fails — the session is truly dead. */
  private sessionExpiredListener: SessionExpiredListener | null = null;

  /**
   * Register a callback for session expiry (refresh token dead).
   * Typically called once in AppBootstrap to wire up logout/redirect.
   */
  onSessionExpired(listener: SessionExpiredListener): void {
    this.sessionExpiredListener = listener;
  }

  expireSession(): void {
    this.handleSessionExpired();
  }

  /**
   * Attempts to refresh the access token using the stored refresh token.
   *
   * - If a refresh is already in flight, returns the existing Promise (mutex).
   * - Uses raw fetch to avoid interceptor loops.
   * - On success: stores new accessToken + refreshToken, returns true.
   * - On failure: clears all tokens, fires sessionExpiredListener, returns false.
   */
  async attemptRefresh(): Promise<boolean> {
    // ── Mutex: if already refreshing, piggyback on the same call ──────────
    if (this.refreshPromise) {
      console.log("[TokenRefresh] Refresh already in progress — waiting...");
      return this.refreshPromise;
    }

    this.refreshPromise = this.executeRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      // Release the mutex regardless of outcome
      this.refreshPromise = null;
    }
  }

  /**
   * The actual refresh HTTP call. Private — only called through attemptRefresh().
   */
  private async executeRefresh(): Promise<boolean> {
    const refreshToken = await tokenManager.getRefreshToken();

    if (!refreshToken) {
      console.warn("[TokenRefresh] No refresh token in storage — session expired");
      this.handleSessionExpired();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${apiEndpoints.auth.refresh}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // The refresh endpoint expects the token in the body, not the header.
          },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // ── Refresh token is itself expired or revoked ───────────────────────
      if (response.status === 401 || response.status === 403) {
        console.warn(
          `[TokenRefresh] Server rejected refresh token (HTTP ${response.status}) — session expired`
        );
        this.handleSessionExpired();
        return false;
      }

      if (!response.ok) {
        console.error(
          `[TokenRefresh] Unexpected HTTP ${response.status} from the refresh endpoint`
        );
        this.handleSessionExpired();
        return false;
      }

      const data: RefreshResponse = await response.json();

      if (!data.accessToken || !data.refreshToken) {
        console.error("[TokenRefresh] Invalid response — missing tokens");
        this.handleSessionExpired();
        return false;
      }

      // ── Store new token pair ─────────────────────────────────────────────
      await tokenManager.setAccessToken(data.accessToken);
      await tokenManager.setRefreshToken(data.refreshToken);

      console.log("[TokenRefresh] ✅ Tokens refreshed successfully");
      return true;
    } catch (error: any) {
      // Network error (offline, DNS failure, etc.)
      console.error("[TokenRefresh] Network error during refresh:", error?.message);
      // Do NOT call handleSessionExpired for network errors — the refresh token
      // may still be valid. The caller will propagate the original 401 to the UI.
      return false;
    }
  }

  /**
   * Clears all stored tokens and notifies the app that the session is dead.
   * The app should redirect to the login screen.
   */
  private handleSessionExpired(): void {
    tokenManager.clearTokens().catch(() => {});
    if (this.sessionExpiredListener) {
      this.sessionExpiredListener();
    }
  }
}

export const tokenRefreshManager = new TokenRefreshManager();
export default tokenRefreshManager;
