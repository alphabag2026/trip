import type { Express } from "express";

// OAuth routes have been removed - this function is intentionally empty
// to prevent any accidental re-registration of Manus OAuth
export function registerOAuthRoutes(_app: Express) {
  // No-op: Manus OAuth has been completely removed
  // Authentication is now handled via email/password login and Kakao OAuth
}
