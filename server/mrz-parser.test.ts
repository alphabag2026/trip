import { describe, it, expect } from "vitest";

// MRZ 함수들을 직접 구현하여 테스트 (routers.ts에서 export하지 않으므로 동일 로직 복제)
function mrzCharValue(ch: string): number {
  if (ch === '<') return 0;
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 90) return code - 55;
  return 0;
}

function mrzCheckDigit(data: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += mrzCharValue(data[i]) * weights[i % 3];
  }
  return sum % 10;
}

function mrzDateToISO(yymmdd: string): string | null {
  if (!yymmdd || yymmdd.length !== 6 || yymmdd.includes('<')) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const year = yy > 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

function parseMrzLine1(line1: string): { surname: string; givenNames: string; issuingCountry: string } {
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const nameField = line1.substring(5).replace(/<+$/, '');
  const nameParts = nameField.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();
  return { surname, givenNames, issuingCountry };
}

function parseMrzLine2(line2: string) {
  const passportNumRaw = line2.substring(0, 9);
  const passportCheckDigit = parseInt(line2[9], 10);
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const dobRaw = line2.substring(13, 19);
  const dobCheckDigit = parseInt(line2[19], 10);
  const gender = line2[20] === '<' ? '' : line2[20];
  const expiryRaw = line2.substring(21, 27);
  const expiryCheckDigit = parseInt(line2[27], 10);
  const personalNum = line2.substring(28, 42);
  const overallCheckDigit = parseInt(line2[43], 10);

  const calcPassportCheck = mrzCheckDigit(passportNumRaw);
  const passportNumberValid = calcPassportCheck === passportCheckDigit;
  const calcDobCheck = mrzCheckDigit(dobRaw);
  const dobValid = calcDobCheck === dobCheckDigit;
  const calcExpiryCheck = mrzCheckDigit(expiryRaw);
  const expiryValid = calcExpiryCheck === expiryCheckDigit;

  const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
  const calcOverallCheck = mrzCheckDigit(overallData);
  const overallValid = calcOverallCheck === overallCheckDigit;

  const passportNumber = passportNumRaw.replace(/</g, '').trim() || null;
  const dateOfBirth = mrzDateToISO(dobRaw);
  const expiryDate = mrzDateToISO(expiryRaw);

  return {
    passportNumber,
    passportNumberValid,
    nationality,
    dateOfBirth,
    dobValid,
    gender,
    expiryDate,
    expiryValid,
    overallValid,
    allChecksValid: passportNumberValid && dobValid && expiryValid && overallValid,
  };
}

describe("MRZ Character Value", () => {
  it("should return 0 for filler character <", () => {
    expect(mrzCharValue('<')).toBe(0);
  });
  it("should return correct values for digits 0-9", () => {
    expect(mrzCharValue('0')).toBe(0);
    expect(mrzCharValue('5')).toBe(5);
    expect(mrzCharValue('9')).toBe(9);
  });
  it("should return correct values for letters A-Z", () => {
    expect(mrzCharValue('A')).toBe(10);
    expect(mrzCharValue('B')).toBe(11);
    expect(mrzCharValue('Z')).toBe(35);
  });
});

describe("MRZ Check Digit Calculation", () => {
  it("should calculate check digit correctly for passport number L898902C3", () => {
    // Example from ICAO spec: L898902C3 → check digit 6
    // L=21, 8=8, 9=9, 8=8, 9=9, 0=0, 2=2, C=12, 3=3
    // 21*7 + 8*3 + 9*1 + 8*7 + 9*3 + 0*1 + 2*7 + 12*3 + 3*1
    // = 147 + 24 + 9 + 56 + 27 + 0 + 14 + 36 + 3 = 316
    // 316 mod 10 = 6
    expect(mrzCheckDigit("L898902C3")).toBe(6);
  });

  it("should calculate check digit for date 740812", () => {
    // 7*7 + 4*3 + 0*1 + 8*7 + 1*3 + 2*1 = 49+12+0+56+3+2 = 122
    // 122 mod 10 = 2
    expect(mrzCheckDigit("740812")).toBe(2);
  });

  it("should calculate check digit for date 120415", () => {
    // 1*7 + 2*3 + 0*1 + 4*7 + 1*3 + 5*1 = 7+6+0+28+3+5 = 49
    // 49 mod 10 = 9
    expect(mrzCheckDigit("120415")).toBe(9);
  });

  it("should handle all-filler input", () => {
    expect(mrzCheckDigit("<<<<<<<<<<<<<<")).toBe(0);
  });
});

describe("MRZ Date Conversion", () => {
  it("should convert YYMMDD to YYYY-MM-DD (20xx for YY <= 50)", () => {
    expect(mrzDateToISO("900115")).toBe("1990-01-15");
    expect(mrzDateToISO("000305")).toBe("2000-03-05");
    expect(mrzDateToISO("501231")).toBe("2050-12-31");
  });
  it("should convert YYMMDD to YYYY-MM-DD (19xx for YY > 50)", () => {
    expect(mrzDateToISO("510101")).toBe("1951-01-01");
    expect(mrzDateToISO("991231")).toBe("1999-12-31");
  });
  it("should return null for invalid input", () => {
    expect(mrzDateToISO("")).toBeNull();
    expect(mrzDateToISO("<<<<<<")).toBeNull();
  });
});

describe("MRZ Line 1 Parsing", () => {
  it("should parse Korean passport line 1", () => {
    const line1 = "P<KORKIM<<MINSOO<<<<<<<<<<<<<<<<<<<<<<<<<<";
    const result = parseMrzLine1(line1);
    expect(result.issuingCountry).toBe("KOR");
    expect(result.surname).toBe("KIM");
    expect(result.givenNames).toBe("MINSOO");
  });

  it("should parse US passport line 1 with multiple given names", () => {
    const line1 = "P<USASMITH<<JOHN<WILLIAM<<<<<<<<<<<<<<<<<<";
    const result = parseMrzLine1(line1);
    expect(result.issuingCountry).toBe("USA");
    expect(result.surname).toBe("SMITH");
    expect(result.givenNames).toBe("JOHN WILLIAM");
  });

  it("should parse passport with hyphenated surname", () => {
    const line1 = "P<GBRJOHNSON<SMITH<<MARY<JANE<<<<<<<<<<<<";
    const result = parseMrzLine1(line1);
    expect(result.issuingCountry).toBe("GBR");
    expect(result.surname).toBe("JOHNSON SMITH");
    expect(result.givenNames).toBe("MARY JANE");
  });
});

describe("MRZ Line 2 Parsing (TD3)", () => {
  it("should parse a valid Korean passport MRZ line 2", () => {
    // M123456783KOR9001152M3012319<<<<<<<<<<<<<<0
    // Passport: M12345678, check=3
    // Nationality: KOR
    // DOB: 900115, check=2
    // Gender: M
    // Expiry: 301231, check=9
    // Personal: <<<<<<<<<<<<<<, check=0
    // Overall check: 0
    
    // Calculate correct check digits
    const passportNum = "M12345678";
    const passportCheck = mrzCheckDigit(passportNum);
    const dobCheck = mrzCheckDigit("900115");
    const expiryCheck = mrzCheckDigit("301231");
    
    const line2 = `${passportNum}${passportCheck}KOR900115${dobCheck}M301231${expiryCheck}<<<<<<<<<<<<<<0`;
    // Recalculate overall
    const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
    const overallCheck = mrzCheckDigit(overallData);
    const correctedLine2 = line2.substring(0, 43) + overallCheck;
    
    const result = parseMrzLine2(correctedLine2);
    expect(result.passportNumber).toBe("M12345678");
    expect(result.passportNumberValid).toBe(true);
    expect(result.nationality).toBe("KOR");
    expect(result.dateOfBirth).toBe("1990-01-15");
    expect(result.dobValid).toBe(true);
    expect(result.gender).toBe("M");
    expect(result.expiryDate).toBe("2030-12-31");
    expect(result.expiryValid).toBe(true);
    expect(result.allChecksValid).toBe(true);
  });

  it("should parse a valid US passport MRZ line 2", () => {
    const passportNum = "123456789";
    const passportCheck = mrzCheckDigit(passportNum);
    const dobCheck = mrzCheckDigit("850320");
    const expiryCheck = mrzCheckDigit("280515");
    
    let line2 = `${passportNum}${passportCheck}USA850320${dobCheck}F280515${expiryCheck}<<<<<<<<<<<<<<0`;
    const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
    const overallCheck = mrzCheckDigit(overallData);
    line2 = line2.substring(0, 43) + overallCheck;
    
    const result = parseMrzLine2(line2);
    expect(result.passportNumber).toBe("123456789");
    expect(result.passportNumberValid).toBe(true);
    expect(result.nationality).toBe("USA");
    expect(result.dateOfBirth).toBe("1985-03-20");
    expect(result.dobValid).toBe(true);
    expect(result.gender).toBe("F");
    expect(result.expiryDate).toBe("2028-05-15");
    expect(result.expiryValid).toBe(true);
    expect(result.allChecksValid).toBe(true);
  });

  it("should detect invalid check digit for passport number", () => {
    // Intentionally wrong check digit
    const line2 = "M123456780KOR9001152M3012319<<<<<<<<<<<<<<0";
    const result = parseMrzLine2(line2);
    // The passport check digit 0 is likely wrong for M12345678
    // We just verify it detects the mismatch
    expect(result.passportNumber).toBe("M12345678");
    // Check if it's actually invalid (depends on calculated value)
    const correctCheck = mrzCheckDigit("M12345678");
    if (correctCheck !== 0) {
      expect(result.passportNumberValid).toBe(false);
    }
  });

  it("should parse Japanese passport", () => {
    const passportNum = "TK1234567";
    const passportCheck = mrzCheckDigit(passportNum);
    const dobCheck = mrzCheckDigit("950810");
    const expiryCheck = mrzCheckDigit("310215");
    
    let line2 = `${passportNum}${passportCheck}JPN950810${dobCheck}M310215${expiryCheck}<<<<<<<<<<<<<<0`;
    const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
    const overallCheck = mrzCheckDigit(overallData);
    line2 = line2.substring(0, 43) + overallCheck;
    
    const result = parseMrzLine2(line2);
    expect(result.passportNumber).toBe("TK1234567");
    expect(result.nationality).toBe("JPN");
    expect(result.dateOfBirth).toBe("1995-08-10");
    expect(result.gender).toBe("M");
    expect(result.expiryDate).toBe("2031-02-15");
    expect(result.allChecksValid).toBe(true);
  });

  it("should parse Vietnamese passport", () => {
    const passportNum = "B12345678";
    const passportCheck = mrzCheckDigit(passportNum);
    const dobCheck = mrzCheckDigit("880620");
    const expiryCheck = mrzCheckDigit("290101");
    
    let line2 = `${passportNum}${passportCheck}VNM880620${dobCheck}F290101${expiryCheck}<<<<<<<<<<<<<<0`;
    const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
    const overallCheck = mrzCheckDigit(overallData);
    line2 = line2.substring(0, 43) + overallCheck;
    
    const result = parseMrzLine2(line2);
    expect(result.passportNumber).toBe("B12345678");
    expect(result.nationality).toBe("VNM");
    expect(result.dateOfBirth).toBe("1988-06-20");
    expect(result.gender).toBe("F");
    expect(result.allChecksValid).toBe(true);
  });

  it("should handle passport number with filler characters", () => {
    const passportNum = "AB123<<<< ";
    const cleanNum = "AB123<<<<";
    const passportCheck = mrzCheckDigit(cleanNum);
    const dobCheck = mrzCheckDigit("700101");
    const expiryCheck = mrzCheckDigit("250101");
    
    let line2 = `${cleanNum}${passportCheck}GBR700101${dobCheck}M250101${expiryCheck}<<<<<<<<<<<<<<0`;
    const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
    const overallCheck = mrzCheckDigit(overallData);
    line2 = line2.substring(0, 43) + overallCheck;
    
    const result = parseMrzLine2(line2);
    expect(result.passportNumber).toBe("AB123");
    expect(result.passportNumberValid).toBe(true);
    expect(result.nationality).toBe("GBR");
    expect(result.allChecksValid).toBe(true);
  });
});

describe("Cross-validation scenarios", () => {
  it("should correctly validate ICAO sample passport", () => {
    // ICAO Doc 9303 example:
    // Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
    // Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10
    const line2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";
    const result = parseMrzLine2(line2);
    
    expect(result.passportNumber).toBe("L898902C3");
    expect(result.passportNumberValid).toBe(true); // check digit 6
    expect(result.nationality).toBe("UTO");
    expect(result.dateOfBirth).toBe("1974-08-12");
    expect(result.dobValid).toBe(true); // check digit 2
    expect(result.gender).toBe("F");
    expect(result.expiryDate).toBe("2012-04-15");
    expect(result.expiryValid).toBe(true); // check digit 9
  });
});
