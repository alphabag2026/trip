import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LOCALES_DIR = path.resolve(__dirname, "../client/src/locales");

// All expected locale files
const EXPECTED_LOCALES = [
  "ko", "en", "zh", "ja", "vi", "th", "id", "ms", "ru", "fr",
  "de", "es", "pt", "it", "ar", "hi", "tr", "pl", "nl", "sv",
  "uk", "tl", "mn"
];

// Sections that must exist in all locale files
const REQUIRED_SECTIONS = [
  "brand", "nav", "home", "register", "lookup", "chatbot",
  "flightPickup", "myPage", "onboarding", "notFound", "immigration", "common"
];

function loadLocale(code: string): Record<string, any> {
  const filePath = path.join(LOCALES_DIR, `${code}.json`);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function getAllKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("i18n Translation Files", () => {
  it("all expected locale files exist", () => {
    for (const code of EXPECTED_LOCALES) {
      const filePath = path.join(LOCALES_DIR, `${code}.json`);
      expect(fs.existsSync(filePath), `${code}.json should exist`).toBe(true);
    }
  });

  it("all locale files are valid JSON", () => {
    for (const code of EXPECTED_LOCALES) {
      expect(() => loadLocale(code)).not.toThrow();
    }
  });

  it("all locale files have required sections", () => {
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      for (const section of REQUIRED_SECTIONS) {
        expect(locale, `${code}.json missing section: ${section}`).toHaveProperty(section);
      }
    }
  });

  it("all locale files have myPage section with key fields", () => {
    const keyFields = ["title", "tabProfile", "tabPassport", "tabTrips", "edit", "save", "cancel"];
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      expect(locale.myPage, `${code}.json should have myPage section`).toBeDefined();
      for (const field of keyFields) {
        expect(locale.myPage[field], `${code}.json myPage.${field} should exist`).toBeDefined();
        expect(typeof locale.myPage[field], `${code}.json myPage.${field} should be string`).toBe("string");
        expect(locale.myPage[field].length, `${code}.json myPage.${field} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("all locale files have onboarding section with key fields", () => {
    const keyFields = ["stepProfile", "stepPassport", "stepComplete", "done", "start"];
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      expect(locale.onboarding, `${code}.json should have onboarding section`).toBeDefined();
      for (const field of keyFields) {
        expect(locale.onboarding[field], `${code}.json onboarding.${field} should exist`).toBeDefined();
        expect(typeof locale.onboarding[field], `${code}.json onboarding.${field} should be string`).toBe("string");
      }
    }
  });

  it("all locale files have notFound section", () => {
    const keyFields = ["title", "desc", "goHome"];
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      expect(locale.notFound, `${code}.json should have notFound section`).toBeDefined();
      for (const field of keyFields) {
        expect(locale.notFound[field], `${code}.json notFound.${field} should exist`).toBeDefined();
      }
    }
  });

  it("all locale files have immigration section", () => {
    const keyFields = ["checklist", "passport", "flightTicket", "hotelVoucher", "tipsTitle"];
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      expect(locale.immigration, `${code}.json should have immigration section`).toBeDefined();
      for (const field of keyFields) {
        expect(locale.immigration[field], `${code}.json immigration.${field} should exist`).toBeDefined();
      }
    }
  });

  it("non-English locales have translated myPage.title (not English)", () => {
    const enLocale = loadLocale("en");
    const enTitle = enLocale.myPage.title;
    
    // Check key languages that should definitely be translated
    const keyLangs = ["ko", "th", "ja", "zh", "vi"];
    for (const code of keyLangs) {
      const locale = loadLocale(code);
      expect(locale.myPage.title, `${code} myPage.title should differ from English`).not.toBe(enTitle);
    }
  });

  it("non-English locales have translated onboarding.done (not English)", () => {
    const enLocale = loadLocale("en");
    const enDone = enLocale.onboarding.done;
    
    const keyLangs = ["ko", "th", "ja", "zh", "vi"];
    for (const code of keyLangs) {
      const locale = loadLocale(code);
      expect(locale.onboarding.done, `${code} onboarding.done should differ from English`).not.toBe(enDone);
    }
  });

  it("placeholders like {{count}} and {{name}} are preserved in translations", () => {
    for (const code of EXPECTED_LOCALES) {
      const locale = loadLocale(code);
      // myPage.tripCount should contain {{count}}
      if (locale.myPage?.tripCount) {
        expect(locale.myPage.tripCount, `${code} myPage.tripCount should contain {{count}}`).toContain("{{count}}");
      }
      // onboarding.welcome should contain {{name}}
      if (locale.onboarding?.welcome) {
        expect(locale.onboarding.welcome, `${code} onboarding.welcome should contain {{name}}`).toContain("{{name}}");
      }
      // immigration.notReady should contain {{count}}
      if (locale.immigration?.notReady) {
        expect(locale.immigration.notReady, `${code} immigration.notReady should contain {{count}}`).toContain("{{count}}");
      }
    }
  });

  it("en.json keys are a superset of required translation keys", () => {
    const enLocale = loadLocale("en");
    const enKeys = getAllKeys(enLocale);
    
    // Check that English has all the keys we expect
    const criticalKeys = [
      "myPage.title", "myPage.tabProfile", "myPage.tabPassport",
      "onboarding.stepProfile", "onboarding.stepPassport",
      "notFound.title", "notFound.goHome",
      "immigration.checklist", "immigration.passport", "immigration.flightTicket"
    ];
    
    for (const key of criticalKeys) {
      expect(enKeys, `en.json should contain key: ${key}`).toContain(key);
    }
  });
});
