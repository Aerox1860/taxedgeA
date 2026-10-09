import { moduleRegistry } from "./ModuleRegistry";
import { container } from "./DependencyContainer";
import { apiClient } from "../../core/api/apiClient";
import { tokenManager } from "../../core/authentication/tokenManager";
import { tokenRefreshManager } from "../../core/authentication/tokenRefreshManager";
import { sessionManager } from "../../core/authentication/sessionManager";
import { logger } from "../../core/logging/logger";
import { router } from "expo-router";
import { useAuthStore } from "../../modules/authentication/store/authStore";

export class AppBootstrap {
  private static isInitialized = false;

  static async init(): Promise<void> {
    if (this.isInitialized) return;

    logger.info("Starting TaxEdge App Bootstrap...");

    // Register core dependencies
    container.register("apiClient", apiClient);
    container.register("tokenManager", tokenManager);
    container.register("sessionManager", sessionManager);
    container.register("logger", logger);

    // ── Request interceptor: attach Bearer token ──────────────────────────
    // ── Session-expired handler ───────────────────────────────────────────
    // An expired or rejected access token requires a fresh login.
    tokenRefreshManager.onSessionExpired(() => {
      logger.warn("Access token expired — ending the current session.");
      useAuthStore.getState().expireSession().catch((error: unknown) => {
        logger.error("Failed to clear the expired session.", error);
      });
      router.replace("/(auth)/login" as any);
    });

    // Initialize all domain modules
    await moduleRegistry.initializeAll();

    this.isInitialized = true;
    logger.info("TaxEdge App Bootstrap completed successfully.");
  }
}

export default AppBootstrap;
