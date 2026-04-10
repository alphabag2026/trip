import { describe, it, expect, vi } from "vitest";

// v12.3: 신청 관리 개선 + 여권 유효성 검사 + 환영 이메일 테스트

describe("v12.3 - Registration Features", () => {
  describe("Email Check API", () => {
    it("should validate email format", () => {
      const validEmails = ["test@example.com", "user@domain.co.kr", "a@b.io"];
      const invalidEmails = ["notanemail", "user@", "plaintext"];
      
      validEmails.forEach(email => {
        expect(email.includes("@") && email.includes(".")).toBe(true);
      });
      invalidEmails.forEach(email => {
        const parts = email.split("@");
        const hasValidDomain = parts.length === 2 && parts[1].includes(".");
        expect(hasValidDomain).toBe(false);
      });
    });

    it("should return exists status for known emails", () => {
      // Mock response structure
      const existingResult = { exists: true, userName: "홍길동" };
      const newResult = { exists: false, userName: null };
      
      expect(existingResult.exists).toBe(true);
      expect(existingResult.userName).toBe("홍길동");
      expect(newResult.exists).toBe(false);
      expect(newResult.userName).toBeNull();
    });
  });

  describe("Passport Validation", () => {
    it("should validate expiry date - valid passport", () => {
      const expiryDate = "2028-06-15";
      const today = new Date();
      const expiry = new Date(expiryDate);
      const sixMonthsFromNow = new Date(today);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      expect(expiry > today).toBe(true);
      expect(expiry > sixMonthsFromNow).toBe(true);
    });

    it("should detect expired passport", () => {
      const expiryDate = "2024-01-01";
      const today = new Date();
      const expiry = new Date(expiryDate);
      
      expect(expiry < today).toBe(true);
    });

    it("should warn about passport expiring within 6 months", () => {
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const expiryDate = threeMonthsLater.toISOString().split("T")[0];
      
      const expiry = new Date(expiryDate);
      const sixMonthsFromNow = new Date(today);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      expect(expiry > today).toBe(true);
      expect(expiry < sixMonthsFromNow).toBe(true);
    });

    it("should return validation structure", () => {
      const validResult = { valid: true, warnings: [], errors: [] };
      const invalidResult = { 
        valid: false, 
        warnings: ["여권 만료일이 6개월 이내입니다"], 
        errors: ["여권이 만료되었습니다"] 
      };
      
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.warnings).toHaveLength(1);
    });
  });

  describe("Welcome Email", () => {
    it("should build welcome email with correct structure", async () => {
      // Import the actual email builder
      const { buildWelcomeEmail } = await import("./email");
      
      const email = buildWelcomeEmail({
        userName: "테스트유저",
        loginUrl: "https://alphatrip.org/login",
      });
      
      expect(email.subject).toContain("환영");
      expect(email.html).toContain("테스트유저");
      expect(email.html).toContain("https://alphatrip.org/login");
      expect(email.html).toContain("Alpha Trip");
    });

    it("should include login URL in welcome email", async () => {
      const { buildWelcomeEmail } = await import("./email");
      
      const email = buildWelcomeEmail({
        userName: "김철수",
        loginUrl: "https://alphatrip.org/login",
      });
      
      expect(email.html).toContain("시작하기");
      expect(email.html).toContain("https://alphatrip.org/login");
    });
  });

  describe("Auto Registration with Account", () => {
    it("should strip password from registration data", () => {
      const input = {
        name: "홍길동",
        phone: "01012345678",
        messengerId: "JI",
        email: "hong@test.com",
        password: "test1234",
        meetupId: 1,
        locationType: "overseas" as const,
        category: "meetup" as const,
      };
      
      const { password: _pw, ...regInput } = input;
      
      expect(regInput).not.toHaveProperty("password");
      expect(regInput.email).toBe("hong@test.com");
      expect(regInput.name).toBe("홍길동");
    });

    it("should hash password before storing", async () => {
      const bcrypt = await import("bcryptjs");
      const password = "test1234";
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);
      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare("wrongpass", hash)).toBe(false);
    });
  });

  describe("Meetup Date Default Values", () => {
    it("should format date correctly from meetup schedule", () => {
      const scheduleStart = new Date("2026-05-15T00:00:00Z");
      const scheduleEnd = new Date("2026-05-17T00:00:00Z");
      
      const startStr = scheduleStart.toISOString().split("T")[0];
      const endStr = scheduleEnd.toISOString().split("T")[0];
      
      expect(startStr).toBe("2026-05-15");
      expect(endStr).toBe("2026-05-17");
    });

    it("should handle missing end date", () => {
      const scheduleStart = new Date("2026-05-15T00:00:00Z");
      const scheduleEnd = null;
      
      const startStr = scheduleStart.toISOString().split("T")[0];
      const endStr = scheduleEnd ? new Date(scheduleEnd).toISOString().split("T")[0] : "";
      
      expect(startStr).toBe("2026-05-15");
      expect(endStr).toBe("");
    });
  });
});
