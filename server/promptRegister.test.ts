import { describe, it, expect } from "vitest";
import * as excel from "./excel";

describe("v6.37 - Prompt Register & Passport Excel Export", () => {
  describe("exportPassportFullToExcel", () => {
    it("should generate an excel buffer with passport data columns", async () => {
      const mockData = [
        {
          regId: 1,
          regName: "PARK SEOKBONG",
          regPhone: "010-1234-5678",
          regTeamName: "박석봉팀",
          regStatus: "approved",
          passportFullName: "PARK SEOKBONG",
          passportNumber: "M99731754",
          passportBirthDate: "1959-02-10",
          passportNationality: "KOR",
          passportIssuingCountry: "KOR",
          passportExpiryDate: "2027-06-28",
          passportGender: "M",
          passportImageUrl: "https://example.com/passport.jpg",
          passportVerified: false,
        },
        {
          regId: 2,
          regName: "KIM WOONGKI",
          regPhone: "010-9876-5432",
          regTeamName: "박석봉팀",
          regStatus: "approved",
          passportFullName: "KIM WOONGKI",
          passportNumber: "M28411732",
          passportBirthDate: "1946-03-10",
          passportNationality: "KOR",
          passportIssuingCountry: "KOR",
          passportExpiryDate: "2028-08-28",
          passportGender: "M",
          passportImageUrl: null,
          passportVerified: true,
        },
      ];

      const buf = await excel.exportPassportFullToExcel(mockData);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it("should handle empty data array", async () => {
      const buf = await excel.exportPassportFullToExcel([]);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it("should handle data with missing passport fields", async () => {
      const mockData = [
        {
          regId: 3,
          regName: "TEST USER",
          regPhone: "010-0000-0000",
          regTeamName: "",
          regStatus: "pending",
          passportFullName: null,
          passportNumber: null,
          passportBirthDate: null,
          passportNationality: null,
          passportIssuingCountry: null,
          passportExpiryDate: null,
          passportGender: null,
          passportImageUrl: null,
          passportVerified: false,
        },
      ];

      const buf = await excel.exportPassportFullToExcel(mockData);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it("should correctly map gender values", async () => {
      const mockData = [
        {
          regId: 1,
          regName: "MALE USER",
          regPhone: "010-1111-1111",
          regTeamName: "",
          regStatus: "approved",
          passportFullName: "MALE USER",
          passportNumber: "M12345",
          passportBirthDate: "1990-01-01",
          passportNationality: "KOR",
          passportIssuingCountry: "KOR",
          passportExpiryDate: "2030-01-01",
          passportGender: "M",
          passportImageUrl: null,
          passportVerified: true,
        },
        {
          regId: 2,
          regName: "FEMALE USER",
          regPhone: "010-2222-2222",
          regTeamName: "",
          regStatus: "approved",
          passportFullName: "FEMALE USER",
          passportNumber: "F12345",
          passportBirthDate: "1992-05-15",
          passportNationality: "KOR",
          passportIssuingCountry: "KOR",
          passportExpiryDate: "2031-05-15",
          passportGender: "F",
          passportImageUrl: "https://example.com/img.jpg",
          passportVerified: false,
        },
      ];

      const buf = await excel.exportPassportFullToExcel(mockData);
      expect(buf).toBeInstanceOf(Buffer);
      // Parse the workbook to verify content
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.getWorksheet("여권정보 목록");
      expect(ws).toBeDefined();
      // Row 2 should be first data row (row 1 is header)
      const row2 = ws!.getRow(2);
      expect(row2.getCell(12).value).toBe("남"); // Gender M -> 남
      const row3 = ws!.getRow(3);
      expect(row3.getCell(12).value).toBe("여"); // Gender F -> 여
    });
  });
});
