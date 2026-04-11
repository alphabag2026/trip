import { describe, it, expect } from "vitest";

describe("Google OAuth Environment Variables", () => {
  it("should have GOOGLE_CLIENT_ID set", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    expect(clientId).toContain(".apps.googleusercontent.com");
  });

  it("should have GOOGLE_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    expect(clientSecret!.length).toBeGreaterThan(10);
  });

  it("should be able to construct Google OAuth URL", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = "https://alphatrip.org/api/auth/google/callback";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    expect(url).toContain("accounts.google.com");
    expect(url).toContain(clientId);
    expect(url).toContain(encodeURIComponent(redirectUri));
  });
});
