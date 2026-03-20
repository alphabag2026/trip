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
const user2Caller = appRouter.createCaller(createUserContext(200));
const adminCaller = appRouter.createCaller(createAdminContext(1));

// ═══════════════════════════════════════════════════════════════
// v4.5 - 호텔 바우처 (Hotel Vouchers)
// ═══════════════════════════════════════════════════════════════
describe("v4.5 - 호텔 바우처", () => {
  it("비인증 사용자는 바우처 생성 불가", async () => {
    await expect(publicCaller.hotelVoucher.create({
      hotelName: "Test Hotel",
      hotelAddress: "123 Test St",
    })).rejects.toThrow();
  });

  it("인증된 사용자는 바우처 생성 가능", async () => {
    const result = await adminCaller.hotelVoucher.create({
      hotelName: "Yen Nam Hotel",
      hotelNameLocal: "Khách sạn Yên Nam",
      hotelAddress: "219 Nguyen Trong Tuyen, Phu Nhuan District, Ho Chi Minh City, Vietnam",
      hotelAddressLocal: "219 Nguyễn Trọng Tuyển, Quận Phú Nhuận, TP HCM",
      hotelPhone: "+84909036229",
      hotelLatitude: "10.7981",
      hotelLongitude: "106.6723",
      bookingId: "1339932759",
      guestName: "Yaninee Yaninee",
      roomType: "Deluxe Double Room City",
      roomCount: 2,
      guestsPerRoom: 1,
      checkInDate: "19 Mar 2026",
      checkInTime: "14:00",
      checkOutDate: "20 Mar 2026",
      checkOutTime: "12:00",
      includes: "Free Wifi",
      specialRequests: "Others (1 king + 2 single bed)",
      cancellationPolicy: "This reservation is non-refundable.",
      checkInInstructions: "Children policy: Child under 12-year-old sharing bed with parents stay free of charge.",
      localLanguage: "vi",
      userId: 100,
    });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("바우처 조회 가능", async () => {
    const all = await adminCaller.hotelVoucher.listAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it("사용자별 바우처 조회 (listMy)", async () => {
    const my = await userCaller.hotelVoucher.listMy();
    expect(Array.isArray(my)).toBe(true);
    // user 100에게 배정된 바우처가 있어야 함
    expect(my.length).toBeGreaterThan(0);
    expect(my[0].hotelName).toBe("Yen Nam Hotel");
  });

  it("다른 사용자는 자신의 바우처만 조회", async () => {
    const my = await user2Caller.hotelVoucher.listMy();
    expect(Array.isArray(my)).toBe(true);
    expect(my.length).toBe(0); // user 200에게는 바우처 없음
  });

  it("바우처 수정 가능", async () => {
    const all = await adminCaller.hotelVoucher.listAll();
    const voucher = all[0];
    await adminCaller.hotelVoucher.update({
      id: voucher.id,
      specialRequests: "Updated request",
    });
    const updated = await adminCaller.hotelVoucher.get({ id: voucher.id });
    expect(updated?.specialRequests).toBe("Updated request");
  });

  it("바우처 삭제 가능", async () => {
    // 삭제용 바우처 생성
    const { id } = await adminCaller.hotelVoucher.create({
      hotelName: "Delete Test Hotel",
      hotelAddress: "Delete Test Address",
    });
    await adminCaller.hotelVoucher.delete({ id });
    const deleted = await adminCaller.hotelVoucher.get({ id });
    expect(deleted).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.5 - 항공권 티켓 (Flight Tickets)
// ═══════════════════════════════════════════════════════════════
describe("v4.5 - 항공권 티켓", () => {
  it("비인증 사용자는 티켓 생성 불가", async () => {
    await expect(publicCaller.flightTicket.create({
      passengerName: "Test User",
    })).rejects.toThrow();
  });

  it("왕복 항공권 생성 가능", async () => {
    const result = await adminCaller.flightTicket.create({
      userId: 100,
      passengerName: "KIM MINHO",
      passportNumber: "M12345678",
      nationality: "한국",
      outboundAirline: "Korean Air",
      outboundFlightNo: "KE659",
      outboundDepartureAirport: "Incheon International Airport",
      outboundDepartureCode: "ICN",
      outboundArrivalAirport: "Tan Son Nhat International Airport",
      outboundArrivalCode: "SGN",
      outboundDepartureDate: "2026-03-19",
      outboundDepartureTime: "10:00",
      outboundArrivalDate: "2026-03-19",
      outboundArrivalTime: "14:00",
      outboundSeatClass: "Economy",
      returnAirline: "Korean Air",
      returnFlightNo: "KE660",
      returnDepartureAirport: "Tan Son Nhat International Airport",
      returnDepartureCode: "SGN",
      returnArrivalAirport: "Incheon International Airport",
      returnArrivalCode: "ICN",
      returnDepartureDate: "2026-03-25",
      returnDepartureTime: "15:00",
      returnArrivalDate: "2026-03-25",
      returnArrivalTime: "22:00",
      returnSeatClass: "Economy",
      bookingReference: "ABC123",
      ticketNumber: "180-1234567890",
      isGenerated: false,
    });
    expect(result.id).toBeDefined();
  });

  it("입국용 임의 티켓 생성 가능 (isGenerated=true)", async () => {
    const result = await adminCaller.flightTicket.create({
      userId: 100,
      passengerName: "KIM MINHO",
      outboundAirline: "VietJet Air",
      outboundFlightNo: "VJ123",
      outboundDepartureCode: "SGN",
      outboundArrivalCode: "ICN",
      outboundDepartureDate: "2026-03-25",
      outboundDepartureTime: "15:00",
      returnAirline: "VietJet Air",
      returnFlightNo: "VJ124",
      returnDepartureCode: "ICN",
      returnArrivalCode: "SGN",
      returnDepartureDate: "2026-04-01",
      returnDepartureTime: "10:00",
      isGenerated: true,
      ticketFileType: "generated",
    });
    expect(result.id).toBeDefined();
  });

  it("사용자별 티켓 조회 (listMy)", async () => {
    const my = await userCaller.flightTicket.listMy();
    expect(Array.isArray(my)).toBe(true);
    expect(my.length).toBeGreaterThan(0);
    expect(my[0].passengerName).toBe("KIM MINHO");
  });

  it("다른 사용자는 자신의 티켓만 조회", async () => {
    const my = await user2Caller.flightTicket.listMy();
    expect(Array.isArray(my)).toBe(true);
    expect(my.length).toBe(0);
  });

  it("티켓 수정 가능", async () => {
    const all = await adminCaller.flightTicket.listAll();
    const ticket = all[0];
    await adminCaller.flightTicket.update({
      id: ticket.id,
      outboundSeatNumber: "12A",
    });
    const updated = await adminCaller.flightTicket.get({ id: ticket.id });
    expect(updated?.outboundSeatNumber).toBe("12A");
  });

  it("티켓 삭제 가능", async () => {
    const { id } = await adminCaller.flightTicket.create({
      passengerName: "Delete Test",
    });
    await adminCaller.flightTicket.delete({ id });
    const deleted = await adminCaller.flightTicket.get({ id });
    expect(deleted).toBeNull();
  });

  it("전체 티켓 목록 조회", async () => {
    const all = await adminCaller.flightTicket.listAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });
});
