import { describe, it, expect } from "vitest";
import { generatePassportPdf, PassportEntry, PassportPdfOptions } from "./passportPdf";

const sampleEntries: PassportEntry[] = [
  { stt: 1, fullName: "PARK CHONG BOK", passportNumber: "546356990", birthYear: "1961", gender: "F", nationality: "USA", phone: "" },
  { stt: 2, fullName: "KIM DONGHEE", passportNumber: "M62127903", birthYear: "1977", gender: "M", nationality: "KOREA", phone: "" },
  { stt: 3, fullName: "Đinh Thị Băng", passportNumber: "E01316991", birthYear: "1991", gender: "F", nationality: "VIETNAM", phone: "" },
  { stt: 4, fullName: "PARK BYUNGRYANG", passportNumber: "M885W2187", birthYear: "1958", gender: "M", nationality: "KOREA", phone: "" },
  { stt: 5, fullName: "SEO YAMUN", passportNumber: "M323G8076", birthYear: "1954", gender: "F", nationality: "KOREA", phone: "" },
];

describe("Passport PDF Generation", () => {
  it("should generate Vietnam police format PDF", async () => {
    const options: PassportPdfOptions = {
      title: "DANH SÁCH KHÁCH DD-MM",
      format: "vietnam_police",
      entries: sampleEntries,
      meetupName: "하롱베이 2140",
      date: "2026-05-10",
    };
    const buffer = await generatePassportPdf(options);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // Check PDF header
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("should generate cruise format PDF", async () => {
    const options: PassportPdfOptions = {
      title: "PASSENGER LIST",
      format: "cruise",
      entries: sampleEntries,
      meetupName: "Cruise Trip 2026",
      date: "2026-05-10",
    };
    const buffer = await generatePassportPdf(options);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("should generate generic format PDF", async () => {
    const options: PassportPdfOptions = {
      title: "여권 정보 목록",
      format: "generic",
      entries: sampleEntries,
      meetupName: "테스트 행사",
      date: "2026-05-10",
    };
    const buffer = await generatePassportPdf(options);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("should handle empty entries", async () => {
    const options: PassportPdfOptions = {
      title: "Empty List",
      format: "generic",
      entries: [],
    };
    const buffer = await generatePassportPdf(options);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("should handle large number of entries (pagination)", async () => {
    const manyEntries: PassportEntry[] = Array.from({ length: 50 }, (_, i) => ({
      stt: i + 1,
      fullName: `PERSON ${i + 1}`,
      passportNumber: `M${String(i).padStart(8, "0")}`,
      birthYear: "1980",
      gender: i % 2 === 0 ? "M" : "F",
      nationality: "KOREA",
      phone: `010-0000-${String(i).padStart(4, "0")}`,
    }));
    const options: PassportPdfOptions = {
      title: "Large List Test",
      format: "vietnam_police",
      entries: manyEntries,
    };
    const buffer = await generatePassportPdf(options);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  });
});
