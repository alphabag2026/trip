import { describe, it, expect } from "vitest";

describe("Resend FROM Email Configuration", () => {
  it("should have RESEND_FROM_EMAIL set", () => {
    expect(process.env.RESEND_FROM_EMAIL).toBeDefined();
    expect(process.env.RESEND_FROM_EMAIL!.length).toBeGreaterThan(0);
  });

  it("should NOT use gmail.com domain (blocked by Resend)", () => {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "";
    expect(fromEmail.toLowerCase()).not.toContain("gmail.com");
  });

  it("should use a valid Resend-compatible domain", () => {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "";
    // Must contain resend.dev (Resend default) or a custom verified domain
    const isResendDev = fromEmail.includes("resend.dev");
    const isCustomDomain = fromEmail.includes("alphatrip");
    expect(isResendDev || isCustomDomain).toBe(true);
  });

  it("should have RESEND_API_KEY set", () => {
    expect(process.env.RESEND_API_KEY).toBeDefined();
    expect(process.env.RESEND_API_KEY!.startsWith("re_")).toBe(true);
  });

  it("should send a test email via Resend API", { timeout: 15000 }, async () => {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: "delivered@resend.dev", // Resend test address
      subject: "[Test] Alpha Trip email delivery test",
      html: "<p>Test email delivery</p>",
    });
    
    // Should not have validation_error about unverified domain
    if (result.error) {
      expect(result.error.name).not.toBe("validation_error");
    }
    // If successful, data should have id
    if (result.data) {
      expect(result.data.id).toBeDefined();
    }
  });
});
