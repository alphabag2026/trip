export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth portal URL is not configured, return a fallback
  if (!oauthPortalUrl) {
    console.warn("VITE_OAUTH_PORTAL_URL is not configured");
    return "#";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const statePayload = returnPath
    ? JSON.stringify({ redirectUri, returnPath })
    : redirectUri;
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
