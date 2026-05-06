import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LOCALES_DIR = path.resolve(__dirname, "../client/src/locales");

const EXPECTED_LOCALES = [
  "ko", "en", "zh", "ja", "vi", "th", "id", "ms", "ru", "fr",
  "de", "es", "pt", "it", "ar", "hi", "tr", "pl", "nl", "sv",
  "uk", "tl", "mn"
];

function loadLocale(code: string): Record<string, any> {
  const filePath = path.join(LOCALES_DIR, `${code}.json`);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Get all leaf keys from a mixed structure (both flat dot-keys and nested dicts)
 */
function getAllLeafKeysMixed(obj: Record<string, any>): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      // Nested dict - recurse with prefix
      for (const subKey of getAllLeafKeysNested(v, k)) {
        keys.add(subKey);
      }
    } else {
      // Flat key (may contain dots like "org_home.welcome")
      keys.add(k);
    }
  }
  return keys;
}

function getAllLeafKeysNested(obj: Record<string, any>, prefix: string): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = `${prefix}.${k}`;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      for (const subKey of getAllLeafKeysNested(v, fullKey)) {
        keys.add(subKey);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

describe("i18n Translation Completeness", () => {
  const koLocale = loadLocale("ko");
  const koKeys = getAllLeafKeysMixed(koLocale);

  it("ko.json has substantial number of translation keys", () => {
    expect(koKeys.size).toBeGreaterThan(3000);
  });

  for (const code of EXPECTED_LOCALES) {
    it(`${code}.json contains all keys from ko.json (100% coverage)`, () => {
      const locale = loadLocale(code);
      const langKeys = getAllLeafKeysMixed(locale);
      
      const missing: string[] = [];
      for (const key of koKeys) {
        if (!langKeys.has(key)) {
          missing.push(key);
        }
      }
      
      expect(missing.length, `${code}.json is missing ${missing.length} keys. First 5: ${missing.slice(0, 5).join(", ")}`).toBe(0);
    });
  }

  it("translateText API endpoint is public (no auth required)", () => {
    // This test verifies the router configuration
    // The translateText procedure should be accessible without authentication
    // We verify this by checking the router file
    const routerContent = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    
    // Check that translateText uses publicProcedure
    const translateTextMatch = routerContent.match(/translateText:\s*(public|protected)Procedure/);
    expect(translateTextMatch).not.toBeNull();
    expect(translateTextMatch![1]).toBe("public");
  });

  it("translator.translate API endpoint is public (no auth required)", () => {
    const routerContent = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    
    // Check that translator.translate uses publicProcedure
    const section = routerContent.substring(
      routerContent.indexOf("translator: router({"),
      routerContent.indexOf("translator: router({") + 200
    );
    expect(section).toContain("publicProcedure");
  });
});
