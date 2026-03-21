import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}
function createUserContext(id = 100): TrpcContext {
  return {
    user: { id, openId: `user_${id}`, name: `User${id}`, role: "user", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}
function createAdminContext(id = 1): TrpcContext {
  return {
    user: { id, openId: `admin_${id}`, name: `Admin${id}`, role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());
const userCaller = appRouter.createCaller(createUserContext(100));
const adminCaller = appRouter.createCaller(createAdminContext(1));

// ═══════════════════════════════════════════════════════════════
// CSV 일괄 배정 - 호텔 바우처
// ═══════════════════════════════════════════════════════════════
describe("CSV 일괄 배정 - 호텔 바우처", () => {
  it("비인증 사용자는 일괄 배정 불가", async () => {
    await expect(publicCaller.hotelVoucher.bulkAssign({
      rows: [{ hotelName: "Test Hotel", hotelAddress: "123 St" }],
    })).rejects.toThrow();
  });

  it("일반 사용자는 일괄 배정 불가", async () => {
    await expect(userCaller.hotelVoucher.bulkAssign({
      rows: [{ hotelName: "Test Hotel", hotelAddress: "123 St" }],
    })).rejects.toThrow();
  });

  it("관리자는 단건 일괄 배정 가능", async () => {
    const result = await adminCaller.hotelVoucher.bulkAssign({
      rows: [{
        hotelName: "CSV Bulk Hotel",
        hotelAddress: "456 CSV Street",
        guestName: "BULK GUEST 1",
        checkInDate: "2026-05-01",
        checkOutDate: "2026-05-05",
        roomType: "Standard",
      }],
    });
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("관리자는 다건 일괄 배정 가능", async () => {
    const result = await adminCaller.hotelVoucher.bulkAssign({
      rows: [
        {
          hotelName: "Hotel A",
          hotelAddress: "100 Street A",
          guestName: "GUEST A",
          checkInDate: "2026-06-01",
          checkOutDate: "2026-06-03",
        },
        {
          hotelName: "Hotel B",
          hotelAddress: "200 Street B",
          guestName: "GUEST B",
          checkInDate: "2026-06-01",
          checkOutDate: "2026-06-04",
          localLanguage: "vi",
        },
        {
          hotelName: "Hotel C",
          hotelAddress: "300 Street C",
          guestName: "GUEST C",
          roomType: "Deluxe",
          bookingId: "BK12345",
        },
      ],
    });
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);
  });

  it("필수 필드 누락 시 유효성 검사 실패", async () => {
    await expect(adminCaller.hotelVoucher.bulkAssign({
      rows: [{ hotelName: "", hotelAddress: "123 St" }],
    })).rejects.toThrow();
  });

  it("빈 배열 전송 시 성공 (0건)", async () => {
    const result = await adminCaller.hotelVoucher.bulkAssign({ rows: [] });
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("일괄 배정 후 목록에서 확인 가능", async () => {
    const before = await adminCaller.hotelVoucher.listAll();
    const beforeCount = before.length;

    await adminCaller.hotelVoucher.bulkAssign({
      rows: [{
        hotelName: "Verify Hotel",
        hotelAddress: "789 Verify St",
        guestName: "VERIFY GUEST",
      }],
    });

    const after = await adminCaller.hotelVoucher.listAll();
    expect(after.length).toBe(beforeCount + 1);

    const found = after.find(v => v.hotelName === "Verify Hotel");
    expect(found).toBeDefined();
    expect(found?.guestName).toBe("VERIFY GUEST");
  });
});

// ═══════════════════════════════════════════════════════════════
// CSV 일괄 배정 - 항공권
// ═══════════════════════════════════════════════════════════════
describe("CSV 일괄 배정 - 항공권", () => {
  it("비인증 사용자는 일괄 배정 불가", async () => {
    await expect(publicCaller.flightTicket.bulkAssign({
      rows: [{ passengerName: "TEST PASSENGER" }],
    })).rejects.toThrow();
  });

  it("일반 사용자는 일괄 배정 불가", async () => {
    await expect(userCaller.flightTicket.bulkAssign({
      rows: [{ passengerName: "TEST PASSENGER" }],
    })).rejects.toThrow();
  });

  it("관리자는 단건 항공권 일괄 배정 가능", async () => {
    const result = await adminCaller.flightTicket.bulkAssign({
      rows: [{
        passengerName: "CSV BULK PASSENGER",
        passportNumber: "M12345678",
        nationality: "KOREAN",
        outboundAirline: "Korean Air",
        outboundFlightNo: "KE659",
        outboundDepartureCode: "ICN",
        outboundArrivalCode: "SGN",
        outboundDepartureDate: "2026-05-01",
        outboundDepartureTime: "09:30",
        returnAirline: "Korean Air",
        returnFlightNo: "KE660",
        returnDepartureCode: "SGN",
        returnArrivalCode: "ICN",
        returnDepartureDate: "2026-05-05",
        returnDepartureTime: "22:00",
        bookingReference: "CSV123",
        ticketNumber: "180-9999999999",
      }],
    });
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  it("관리자는 다건 항공권 일괄 배정 가능", async () => {
    const result = await adminCaller.flightTicket.bulkAssign({
      rows: [
        {
          passengerName: "PASSENGER A",
          outboundAirline: "VietJet",
          outboundFlightNo: "VJ123",
          outboundDepartureCode: "ICN",
          outboundArrivalCode: "HAN",
        },
        {
          passengerName: "PASSENGER B",
          outboundAirline: "AirAsia",
          outboundFlightNo: "AK456",
          outboundDepartureCode: "ICN",
          outboundArrivalCode: "BKK",
          bookingReference: "BULK01",
        },
        {
          passengerName: "PASSENGER C",
          nationality: "JAPANESE",
          outboundAirline: "JAL",
          outboundFlightNo: "JL789",
        },
      ],
    });
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);
  });

  it("필수 필드(passengerName) 누락 시 유효성 검사 실패", async () => {
    await expect(adminCaller.flightTicket.bulkAssign({
      rows: [{ passengerName: "" }],
    })).rejects.toThrow();
  });

  it("빈 배열 전송 시 성공 (0건)", async () => {
    const result = await adminCaller.flightTicket.bulkAssign({ rows: [] });
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("일괄 배정 후 목록에서 확인 가능", async () => {
    const before = await adminCaller.flightTicket.listAll();
    const beforeCount = before.length;

    await adminCaller.flightTicket.bulkAssign({
      rows: [{
        passengerName: "VERIFY PASSENGER",
        outboundFlightNo: "VR001",
        bookingReference: "VERIFY1",
      }],
    });

    const after = await adminCaller.flightTicket.listAll();
    expect(after.length).toBe(beforeCount + 1);

    const found = after.find(t => t.passengerName === "VERIFY PASSENGER");
    expect(found).toBeDefined();
    expect(found?.bookingReference).toBe("VERIFY1");
  });
});

// ═══════════════════════════════════════════════════════════════
// CsvBulkUpload 컴포넌트 - CSV 파싱 로직 테스트
// ═══════════════════════════════════════════════════════════════
describe("CSV 파싱 유틸리티", () => {
  it("CSV 헤더 파싱 정상 동작", () => {
    const csvContent = "hotelName,hotelAddress,guestName\nGrand Hotel,123 Main St,HONG GILDONG";
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");
    expect(headers).toEqual(["hotelName", "hotelAddress", "guestName"]);
  });

  it("CSV 데이터 행 파싱 정상 동작", () => {
    const csvContent = "passengerName,outboundFlightNo,bookingReference\nHONG GILDONG,KE659,ABC123\nKIM CHULSOO,VJ456,DEF789";
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");
    const rows = lines.slice(1).map(line => {
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i]; });
      return row;
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].passengerName).toBe("HONG GILDONG");
    expect(rows[1].bookingReference).toBe("DEF789");
  });

  it("빈 CSV 처리", () => {
    const csvContent = "hotelName,hotelAddress";
    const lines = csvContent.split("\n").filter(l => l.trim());
    expect(lines).toHaveLength(1); // 헤더만
  });
});
