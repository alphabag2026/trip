import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  generateFlightSearchLinks,
  generateHotelSearchLinks,
  getAirportInfo,
  AIRPORT_MAP,
  type AffiliateConfig,
} from "./affiliateHelper";

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
// v5.0 - 어필리에이트 예약 시스템 테스트
// ═══════════════════════════════════════════════════════════════

describe("v5.0 - affiliateHelper 유닛 테스트", () => {
  const testConfig: AffiliateConfig = {
    tripComAffId: "test_trip_123",
    bookingComAffId: "test_booking_456",
    agodaCid: "test_agoda_789",
    skyscannerAffId: "test_sky_abc",
    travelpayoutsMarker: "test_tp_marker",
  };

  describe("getAirportInfo", () => {
    it("ICN 공항 정보를 반환한다", () => {
      const info = getAirportInfo("ICN");
      expect(info).toBeDefined();
      expect(info?.city).toBe("Seoul/Incheon");
      expect(info?.cityKo).toBeDefined();
    });

    it("BKK 공항 정보를 반환한다", () => {
      const info = getAirportInfo("BKK");
      expect(info).toBeDefined();
      expect(info?.city).toBe("Bangkok");
    });

    it("존재하지 않는 코드는 폴백 값을 반환한다", () => {
      const info = getAirportInfo("ZZZ");
      expect(info).toBeDefined();
      // 알 수 없는 코드는 코드 자체를 city로 사용
      expect(info?.country).toBe("??");
    });

    it("AIRPORT_MAP에 주요 공항이 포함되어 있다", () => {
      expect(AIRPORT_MAP).toHaveProperty("ICN");
      expect(AIRPORT_MAP).toHaveProperty("NRT");
      expect(AIRPORT_MAP).toHaveProperty("BKK");
      expect(AIRPORT_MAP).toHaveProperty("SIN");
    });
  });

  describe("generateFlightSearchLinks", () => {
    it("모든 플랫폼에 대한 항공편 검색 링크를 생성한다", () => {
      const links = generateFlightSearchLinks({
        origin: "ICN",
        destination: "BKK",
        departureDate: "2026-04-01",
        returnDate: "2026-04-08",
        passengers: 2,
      }, testConfig);

      expect(links.length).toBeGreaterThan(0);
      links.forEach(link => {
        expect(link).toHaveProperty("platform");
        expect(link).toHaveProperty("platformName");
        expect(link).toHaveProperty("url");
        expect(link.url).toMatch(/^https?:\/\//);
      });
    });

    it("어필리에이트 ID가 없어도 기본 링크를 생성한다", () => {
      const links = generateFlightSearchLinks({
        origin: "ICN",
        destination: "NRT",
        departureDate: "2026-05-01",
      }, {});

      expect(links.length).toBeGreaterThan(0);
    });

    it("편도 검색도 지원한다", () => {
      const links = generateFlightSearchLinks({
        origin: "ICN",
        destination: "SIN",
        departureDate: "2026-06-01",
      }, testConfig);

      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe("generateHotelSearchLinks", () => {
    it("모든 플랫폼에 대한 호텔 검색 링크를 생성한다", () => {
      const links = generateHotelSearchLinks({
        city: "Bangkok",
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
        rooms: 1,
        guests: 2,
      }, testConfig);

      expect(links.length).toBeGreaterThan(0);
      links.forEach(link => {
        expect(link).toHaveProperty("platform");
        expect(link).toHaveProperty("platformName");
        expect(link).toHaveProperty("url");
        expect(link.url).toMatch(/^https?:\/\//);
      });
    });

    it("어필리에이트 ID가 없어도 기본 링크를 생성한다", () => {
      const links = generateHotelSearchLinks({
        city: "Tokyo",
        checkIn: "2026-05-01",
        checkOut: "2026-05-03",
      }, {});

      expect(links.length).toBeGreaterThan(0);
    });
  });
});

describe("v5.0 - booking 라우터 테스트", () => {
  describe("airports", () => {
    it("공항 목록을 반환한다 (공개 접근)", async () => {
      const result = await publicCaller.booking.airports();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      const icn = result.find((a: any) => a.code === "ICN");
      expect(icn).toBeDefined();
      // city 또는 cityKo 필드 확인
      expect(icn?.city || icn?.cityKo).toBeDefined();
    });
  });

  describe("searchFlights", () => {
    it("비인증 사용자는 항공편 검색 불가", async () => {
      await expect(publicCaller.booking.searchFlights({
        origin: "ICN",
        destination: "BKK",
        departureDate: "2026-04-01",
      })).rejects.toThrow();
    });

    it("인증된 사용자는 항공편 검색 가능", async () => {
      const result = await userCaller.booking.searchFlights({
        origin: "ICN",
        destination: "BKK",
        departureDate: "2026-04-01",
        returnDate: "2026-04-08",
        passengers: 2,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("platforms");
      expect(Array.isArray(result.platforms)).toBe(true);
      expect(result.platforms.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("searchId");
    });
  });

  describe("searchHotels", () => {
    it("비인증 사용자는 호텔 검색 불가", async () => {
      await expect(publicCaller.booking.searchHotels({
        city: "Bangkok",
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
      })).rejects.toThrow();
    });

    it("인증된 사용자는 호텔 검색 가능", async () => {
      const result = await userCaller.booking.searchHotels({
        city: "Bangkok",
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
        rooms: 1,
        guests: 2,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("platforms");
      expect(Array.isArray(result.platforms)).toBe(true);
      expect(result.platforms.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("searchId");
    });
  });

  describe("trackClick", () => {
    it("클릭 추적은 linkId가 필요하다", async () => {
      // trackClick은 publicProcedure이지만 linkId가 필수
      await expect(publicCaller.booking.trackClick({
        linkId: 999999, // 존재하지 않는 linkId는 에러 없이 실행됨 (increment)
      })).resolves.toBeDefined();
    });
  });
});

describe("v5.0 - affiliate 라우터 테스트", () => {
  describe("settings", () => {
    it("비인증 사용자는 설정 조회 불가", async () => {
      await expect(publicCaller.affiliate.settings()).rejects.toThrow();
    });

    it("일반 사용자는 설정 조회 불가", async () => {
      await expect(userCaller.affiliate.settings()).rejects.toThrow();
    });

    it("관리자는 설정 조회 가능", async () => {
      const result = await adminCaller.affiliate.settings();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("upsertSetting", () => {
    it("관리자는 어필리에이트 설정을 생성/수정할 수 있다", async () => {
      const result = await adminCaller.affiliate.upsertSetting({
        platform: "trip_com",
        affiliateId: "test_trip_123",
        isActive: true,
        commissionRateFlight: "0.8",
        commissionRateHotel: "4.0",
      });
      expect(result.success).toBe(true);

      // 설정이 저장되었는지 확인
      const settings = await adminCaller.affiliate.settings();
      const tripSetting = settings.find((s: any) => s.platform === "trip_com");
      expect(tripSetting).toBeDefined();
      expect(tripSetting?.affiliateId).toBe("test_trip_123");
      expect(tripSetting?.isActive).toBe(true);
    });
  });

  describe("stats", () => {
    it("관리자는 수익 통계를 조회할 수 있다", async () => {
      const result = await adminCaller.affiliate.stats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("pendingRevenue");
      expect(result).toHaveProperty("totalBookings");
      expect(result).toHaveProperty("totalClicks");
    });
  });

  describe("addRevenue", () => {
    it("관리자는 수익을 추가할 수 있다", async () => {
      const result = await adminCaller.affiliate.addRevenue({
        platform: "trip_com",
        revenueType: "flight",
        bookingAmount: "500.00",
        commissionRate: "0.8",
        commissionAmount: "4.00",
        currency: "USD",
        status: "pending",
        revenueMonth: "2026-04",
      });
      expect(result).toBeDefined();
      // addRevenue는 { id } 반환
      expect(typeof result.id).toBe("number");
    });
  });

  describe("revenue", () => {
    it("관리자는 수익 목록을 조회할 수 있다", async () => {
      const result = await adminCaller.affiliate.revenue({});
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("breakdown", () => {
    it("관리자는 플랫폼별 수익 분석을 조회할 수 있다", async () => {
      const result = await adminCaller.affiliate.breakdown();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("v5.0 - telegram 항공편/호텔 검색 전송 테스트", () => {
  it("비인증 사용자는 항공편 검색 전송 불가", async () => {
    await expect(publicCaller.telegram.sendFlightSearch({
      origin: "ICN",
      destination: "BKK",
      departureDate: "2026-04-01",
    })).rejects.toThrow();
  });

  it("비인증 사용자는 호텔 검색 전송 불가", async () => {
    await expect(publicCaller.telegram.sendHotelSearch({
      city: "Bangkok",
      checkIn: "2026-04-01",
      checkOut: "2026-04-05",
    })).rejects.toThrow();
  });

  it("일반 사용자는 항공편 검색 전송 불가 (admin only)", async () => {
    await expect(userCaller.telegram.sendFlightSearch({
      origin: "ICN",
      destination: "BKK",
      departureDate: "2026-04-01",
    })).rejects.toThrow();
  });
});
