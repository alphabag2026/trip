import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ═══════════════════════════════════════════════════════════════
// Helper: create context for different roles
// ═══════════════════════════════════════════════════════════════
function createContext(role: string | null): TrpcContext {
  const user = role
    ? {
        id: 1,
        openId: `test_${role}`,
        name: `Test ${role}`,
        email: `${role}@test.com`,
        passwordHash: null,
        loginMethod: "manus",
        role: role as any,
        organizationId: null,
        totpSecret: null,
        totpEnabled: false,
        emailVerified: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createContext(null));
const userCaller = appRouter.createCaller(createContext("user"));
const organizerCaller = appRouter.createCaller(createContext("organizer"));
const adminCaller = appRouter.createCaller(createContext("admin"));
const superadminCaller = appRouter.createCaller(createContext("superadmin"));

// ═══════════════════════════════════════════════════════════════
// 1. 권한 분리 테스트 - adminProcedure (admin, superadmin, organizer 허용)
// ═══════════════════════════════════════════════════════════════
describe("adminProcedure 권한 분리", () => {
  it("organizer는 registration.list 호출 가능 (adminProcedure)", async () => {
    const result = await organizerCaller.registration.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin은 registration.list 호출 가능", async () => {
    const result = await adminCaller.registration.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("superadmin은 registration.list 호출 가능", async () => {
    const result = await superadminCaller.registration.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("일반 user는 registration.list 호출 불가", async () => {
    await expect(userCaller.registration.list({})).rejects.toThrow();
  });

  it("비로그인 사용자는 registration.list 호출 불가", async () => {
    await expect(publicCaller.registration.list({})).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 권한 분리 테스트 - superadminProcedure (admin, superadmin만 허용)
// ═══════════════════════════════════════════════════════════════
describe("superadminProcedure 권한 분리", () => {
  it("superadmin은 platform.stats 호출 가능", async () => {
    const result = await superadminCaller.platform.stats();
    expect(result).toHaveProperty("totalUsers");
  });

  it("admin은 platform.stats 호출 가능", async () => {
    const result = await adminCaller.platform.stats();
    expect(result).toHaveProperty("totalUsers");
  });

  it("organizer는 platform.stats 호출 불가 (superadmin 전용)", async () => {
    await expect(organizerCaller.platform.stats()).rejects.toThrow();
  });

  it("일반 user는 platform.stats 호출 불가", async () => {
    await expect(userCaller.platform.stats()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 엑셀 내보내기 테스트
// ═══════════════════════════════════════════════════════════════
describe("엑셀 서식 다운로드 (excelExport)", () => {
  it("pickupTemplate은 admin이 호출 가능하며 base64 + filename 반환", async () => {
    const result = await adminCaller.excelExport.pickupTemplate();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(typeof result.base64).toBe("string");
    expect(result.base64.length).toBeGreaterThan(0);
    expect(result.filename).toContain(".xlsx");
  });

  it("accommodationTemplate은 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.accommodationTemplate();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain(".xlsx");
  });

  it("eventTemplate은 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.eventTemplate();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain(".xlsx");
  });

  it("itineraryTemplate은 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.itineraryTemplate();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain(".xlsx");
  });

  it("attendeeTemplate은 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.attendeeTemplate();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain(".xlsx");
  });

  it("organizer도 서식 다운로드 가능", async () => {
    const result = await organizerCaller.excelExport.pickupTemplate();
    expect(result).toHaveProperty("base64");
    expect(result.filename).toContain(".xlsx");
  });

  it("일반 user는 서식 다운로드 불가", async () => {
    await expect(userCaller.excelExport.pickupTemplate()).rejects.toThrow();
  });

  it("비로그인 사용자는 서식 다운로드 불가", async () => {
    await expect(publicCaller.excelExport.pickupTemplate()).rejects.toThrow();
  });
});

describe("엑셀 데이터 내보내기 (excelExport)", () => {
  it("exportPickups는 admin이 호출 가능하며 base64 + filename 반환", async () => {
    const result = await adminCaller.excelExport.exportPickups({});
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(typeof result.base64).toBe("string");
    expect(result.filename).toContain(".xlsx");
  });

  it("exportAccommodations는 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.exportAccommodations({});
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
  });

  it("exportEvents는 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.exportEvents({});
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
  });

  it("exportItineraries는 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.exportItineraries();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
  });

  it("exportAttendees는 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.exportAttendees();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
  });

  it("exportStats는 admin이 호출 가능", async () => {
    const result = await adminCaller.excelExport.exportStats();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
  });

  it("일반 user는 데이터 내보내기 불가", async () => {
    await expect(userCaller.excelExport.exportPickups({})).rejects.toThrow();
  });
});
