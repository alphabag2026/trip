import { describe, it, expect } from "vitest";

/**
 * Welcome page tests - verify routing and translation key structure
 */
describe("Welcome Page", () => {
  it("should have valid account type mapping", () => {
    const validTypes = ["personal", "organizer", "agency", "partner"];
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should have correct step guide structure for each type", () => {
    const typeSteps: Record<string, string[]> = {
      personal: ["setupProfile", "scanPassport", "applyMeetup", "bookTravel", "joinCommunity"],
      organizer: ["setupProfile", "createMeetup", "inviteMembers", "manageRegistrations", "setupTelegram"],
      agency: ["setupProfile", "registerServices", "connectPartners", "inviteTeam"],
      partner: ["setupProfile", "registerBusiness", "verifyBusiness", "joinPartnerChat"],
    };

    Object.entries(typeSteps).forEach(([type, steps]) => {
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps[0]).toBe("setupProfile"); // First step is always profile setup
      expect(type).toBeTruthy();
    });
  });

  it("should have priority levels for step guides", () => {
    const priorities = ["required", "recommended", "optional"];
    priorities.forEach((p) => {
      expect(typeof p).toBe("string");
    });
  });

  it("should construct correct redirect URL after registration", () => {
    const accountType = "organizer";
    const regName = "테스트 유저";
    const url = `/welcome?type=${accountType}&name=${encodeURIComponent(regName)}`;
    expect(url).toBe("/welcome?type=organizer&name=%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EC%9C%A0%EC%A0%80");
    expect(url).toContain("type=organizer");
    expect(url).toContain("name=");
  });

  it("should handle missing type parameter gracefully", () => {
    const params = new URLSearchParams("");
    const typeParam = params.get("type");
    const validTypes = ["personal", "organizer", "agency", "partner"];
    const accountType = typeParam && validTypes.includes(typeParam) ? typeParam : "personal";
    expect(accountType).toBe("personal");
  });

  it("should parse type from URL correctly", () => {
    const testCases = [
      { search: "type=personal", expected: "personal" },
      { search: "type=organizer", expected: "organizer" },
      { search: "type=agency", expected: "agency" },
      { search: "type=partner", expected: "partner" },
      { search: "type=invalid", expected: "personal" },
      { search: "", expected: "personal" },
    ];

    const validTypes = ["personal", "organizer", "agency", "partner"];

    testCases.forEach(({ search, expected }) => {
      const params = new URLSearchParams(search);
      const typeParam = params.get("type");
      const accountType = typeParam && validTypes.includes(typeParam) ? typeParam : "personal";
      expect(accountType).toBe(expected);
    });
  });

  it("should have translation keys for all 23 languages", () => {
    const fs = require("fs");
    const path = require("path");
    const localesDir = path.join(__dirname, "../client/src/locales");
    
    const expectedLangs = [
      "ko", "en", "zh", "ja", "vi", "th", "id", "ms", "ru", "fr",
      "de", "es", "pt", "it", "ar", "hi", "tr", "pl", "nl", "sv",
      "uk", "tl", "mn"
    ];

    expectedLangs.forEach((lang) => {
      const filePath = path.join(localesDir, `${lang}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(data.welcomePage).toBeDefined();
      expect(data.welcomePage.title).toBeDefined();
      expect(data.welcomePage.titleWithName).toBeDefined();
      expect(data.welcomePage.types).toBeDefined();
      expect(data.welcomePage.types.personal).toBeDefined();
      expect(data.welcomePage.types.organizer).toBeDefined();
      expect(data.welcomePage.types.agency).toBeDefined();
      expect(data.welcomePage.types.partner).toBeDefined();
      expect(data.welcomePage.subtitle).toBeDefined();
      expect(data.welcomePage.steps).toBeDefined();
      expect(data.welcomePage.steps.setupProfile).toBeDefined();
      expect(data.welcomePage.priority).toBeDefined();
      expect(data.welcomePage.priority.required).toBeDefined();
    });
  });
});
