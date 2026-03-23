import { describe, it, expect } from "vitest";

describe("Resend API Key Validation", () => {
  it("should have RESEND_API_KEY environment variable set", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("re_")).toBe(true);
  });

  it("should have RESEND_FROM_EMAIL environment variable set", () => {
    const email = process.env.RESEND_FROM_EMAIL;
    expect(email).toBeDefined();
    expect(email).not.toBe("");
    expect(email).toContain("@");
  });

  it("should be able to initialize Resend client", async () => {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    expect(resend).toBeDefined();
  });

  it("should have KAKAO_CLIENT_ID environment variable set", () => {
    const key = process.env.KAKAO_CLIENT_ID;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
  });
});
