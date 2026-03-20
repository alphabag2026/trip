import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Transport Type Feature", () => {
  // Test 1: Schema has transportType field
  it("should have transportType enum in schema", () => {
    const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toContain('transportType: mysqlEnum("transportType"');
    expect(schema).toContain('"flight"');
    expect(schema).toContain('"ktx"');
    expect(schema).toContain('"none"');
    expect(schema).toContain('"other"');
  });

  // Test 2: Schema has transportNotes field
  it("should have transportNotes text field in schema", () => {
    const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toContain('transportNotes: text("transportNotes")');
  });

  // Test 3: Router accepts transportType in registration create
  it("should accept transportType in registration create procedure", () => {
    const routerPath = path.join(__dirname, "routers.ts");
    const router = fs.readFileSync(routerPath, "utf-8");
    expect(router).toContain('transportType: z.enum(["flight", "ktx", "none", "other"]).optional()');
    expect(router).toContain("transportNotes: z.string().optional()");
  });

  // Test 4: Telegram message includes transport info
  it("should include transport info in telegram message", () => {
    const routerPath = path.join(__dirname, "routers.ts");
    const router = fs.readFileSync(routerPath, "utf-8");
    expect(router).toContain("transportLabel");
    expect(router).toContain("transportInfo");
    expect(router).toContain("🚄 교통수단:");
  });

  // Test 5: All language files have transport keys
  it("should have transport keys in all language files", () => {
    const localesDir = path.join(__dirname, "../client/src/locales");
    const files = fs.readdirSync(localesDir).filter(f => f.endsWith(".json"));
    
    const requiredKeys = [
      "transportTitle",
      "transport_flight",
      "transport_ktx",
      "transport_none",
      "transport_other",
      "transportNotes",
      "transportNotesPh",
      "transportFlightInfo",
      "transportKtxInfo"
    ];

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf-8"));
      const register = data.register || {};
      for (const key of requiredKeys) {
        expect(register[key], `${file} missing register.${key}`).toBeDefined();
        expect(register[key], `${file} register.${key} should not be empty`).not.toBe("");
      }
    }
  });

  // Test 6: Register page uses transport UI
  it("should have transport selection UI in Register page", () => {
    const registerPath = path.join(__dirname, "../client/src/pages/Register.tsx");
    const register = fs.readFileSync(registerPath, "utf-8");
    expect(register).toContain("transportType");
    expect(register).toContain("transportTitle");
    expect(register).toContain("transport_flight");
    expect(register).toContain("transport_ktx");
    expect(register).toContain("transport_none");
    expect(register).toContain("transport_other");
    expect(register).toContain('locationType === "domestic"');
  });
});
