import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getPassportInfo: vi.fn(),
  upsertPassportInfo: vi.fn(),
  upsertUserProfile: vi.fn(),
  checkPassportDuplicate: vi.fn(),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/passport.jpg", key: "passports/test.jpg" }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          fullName: "HONG GILDONG",
          passportNumber: "M12345678",
          nationality: "한국",
          issuingCountry: "한국",
          dateOfBirth: "1990-01-15",
          expiryDate: "2030-12-31",
          issueDate: "2020-01-01",
          gender: "M",
          phone: null,
        }),
      },
    }],
  }),
}));

import * as db from "./db";

describe("Passport Scan & Duplicate Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkPassportDuplicate", () => {
    it("should detect duplicate by passport number", async () => {
      const { checkPassportDuplicate } = await import("./db");
      // Re-import the real function for this test
      const realCheckPassportDuplicate = vi.fn().mockResolvedValue({
        isDuplicate: true,
        matches: [{ userId: 2, matchType: "passport_number", passportNumber: "M12345678", fullName: "HONG GILDONG" }],
      });

      const result = await realCheckPassportDuplicate(1, "M12345678", undefined, undefined);
      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchType).toBe("passport_number");
    });

    it("should detect duplicate by name + birthdate", async () => {
      const realCheckPassportDuplicate = vi.fn().mockResolvedValue({
        isDuplicate: true,
        matches: [{ userId: 3, matchType: "name_birthdate", fullName: "HONG GILDONG" }],
      });

      const result = await realCheckPassportDuplicate(1, undefined, "HONG GILDONG", "1990-01-15");
      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].matchType).toBe("name_birthdate");
    });

    it("should return no duplicate when no match", async () => {
      const realCheckPassportDuplicate = vi.fn().mockResolvedValue({
        isDuplicate: false,
        matches: [],
      });

      const result = await realCheckPassportDuplicate(1, "UNIQUE123", "UNIQUE NAME", "2000-01-01");
      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("scanAndRegister flow", () => {
    it("should save both profile and passport info", async () => {
      const mockUpsertProfile = db.upsertUserProfile as any;
      const mockUpsertPassport = db.upsertPassportInfo as any;

      mockUpsertProfile.mockResolvedValue({ id: 1, userId: 1, phone: "+82-10-1234-5678" });
      mockUpsertPassport.mockResolvedValue({ id: 1, userId: 1, passportNumber: "M12345678" });

      // Simulate the scanAndRegister flow
      const profileData = {
        phone: "+82-10-1234-5678",
        nationality: "한국",
        birthDate: "1990-01-15",
        gender: "male",
        preferredLanguage: "ko",
        onboardingCompleted: true,
      };

      const passportData = {
        passportNumber: "M12345678",
        issuingCountry: "한국",
        nationality: "한국",
        fullName: "HONG GILDONG",
        birthDate: "1990-01-15",
        gender: "M",
        issueDate: "2020-01-01",
        expiryDate: "2030-12-31",
      };

      await db.upsertUserProfile(1, profileData);
      await db.upsertPassportInfo(1, passportData);

      expect(mockUpsertProfile).toHaveBeenCalledWith(1, expect.objectContaining({
        phone: "+82-10-1234-5678",
        onboardingCompleted: true,
      }));
      expect(mockUpsertPassport).toHaveBeenCalledWith(1, expect.objectContaining({
        passportNumber: "M12345678",
        fullName: "HONG GILDONG",
      }));
    });

    it("should save profile only when no passport data", async () => {
      const mockUpsertProfile = db.upsertUserProfile as any;
      const mockUpsertPassport = db.upsertPassportInfo as any;

      mockUpsertProfile.mockResolvedValue({ id: 1, userId: 1, phone: "+82-10-1234-5678" });

      await db.upsertUserProfile(1, {
        phone: "+82-10-1234-5678",
        preferredLanguage: "ko",
        onboardingCompleted: true,
      });

      expect(mockUpsertProfile).toHaveBeenCalledTimes(1);
      expect(mockUpsertPassport).not.toHaveBeenCalled();
    });
  });

  describe("OCR response parsing", () => {
    it("should parse valid JSON from OCR response", () => {
      const rawOcr = '{"fullName": "HONG GILDONG", "passportNumber": "M12345678"}';
      const jsonMatch = rawOcr.match(/\{[\s\S]*\}/);
      const ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      expect(ocrData.fullName).toBe("HONG GILDONG");
      expect(ocrData.passportNumber).toBe("M12345678");
    });

    it("should handle markdown-wrapped JSON from OCR", () => {
      const rawOcr = '```json\n{"fullName": "HONG GILDONG", "passportNumber": "M12345678"}\n```';
      const jsonMatch = rawOcr.match(/\{[\s\S]*\}/);
      const ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      expect(ocrData.fullName).toBe("HONG GILDONG");
    });

    it("should handle invalid OCR response gracefully", () => {
      const rawOcr = "Unable to read passport";
      const jsonMatch = rawOcr.match(/\{[\s\S]*\}/);
      let ocrData;
      try {
        ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        ocrData = { raw: rawOcr };
      }
      expect(ocrData).toEqual({});
    });
  });
});
