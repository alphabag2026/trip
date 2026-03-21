import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createExternalApiRouter } from "./externalApi";

function createAdminContext(id = 1): TrpcContext {
  return {
    user: { id, openId: `admin_${id}`, name: `Admin${id}`, role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
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

const adminCaller = appRouter.createCaller(createAdminContext(1));
const userCaller = appRouter.createCaller(createUserContext(100));

// ═══════════════════════════════════════════════════════════════
// v5.1 - 외부 REST API + API 키 관리 테스트
// ═══════════════════════════════════════════════════════════════

describe("v5.1 - API 키 관리 (tRPC)", () => {
  let createdKeyId: number;
  let createdApiKey: string;

  it("admin이 API 키를 생성할 수 있다", async () => {
    const result = await adminCaller.apiKeys.create({
      name: "Test Integration Key",
      permissions: ["meetups:read", "registrations:read"],
      rateLimit: 500,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.apiKey).toMatch(/^mt_live_/);
    expect(result.keyPrefix).toBe(result.apiKey.slice(0, 12));
    createdKeyId = result.id;
    createdApiKey = result.apiKey;
  });

  it("admin이 API 키 목록을 조회할 수 있다", async () => {
    const keys = await adminCaller.apiKeys.list();
    expect(Array.isArray(keys)).toBe(true);
    const found = keys.find((k: any) => k.id === createdKeyId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Test Integration Key");
    expect(found!.isActive).toBe(true);
    expect(found!.rateLimit).toBe(500);
  });

  it("admin이 API 키를 비활성화할 수 있다", async () => {
    const result = await adminCaller.apiKeys.toggle({ id: createdKeyId, isActive: false });
    expect(result.success).toBe(true);

    const keys = await adminCaller.apiKeys.list();
    const found = keys.find((k: any) => k.id === createdKeyId);
    expect(found!.isActive).toBe(false);
  });

  it("admin이 API 키를 다시 활성화할 수 있다", async () => {
    const result = await adminCaller.apiKeys.toggle({ id: createdKeyId, isActive: true });
    expect(result.success).toBe(true);
  });

  it("admin이 API 사용 통계를 조회할 수 있다", async () => {
    const usage = await adminCaller.apiKeys.usage({ apiKeyId: createdKeyId });
    expect(usage).toBeDefined();
    expect(typeof usage.hourlyRequests).toBe("number");
    expect(typeof usage.dailyRequests).toBe("number");
  });

  it("admin이 API 요청 로그를 조회할 수 있다", async () => {
    const logs = await adminCaller.apiKeys.logs({ apiKeyId: createdKeyId, limit: 10 });
    expect(Array.isArray(logs)).toBe(true);
  });

  it("만료일이 있는 API 키를 생성할 수 있다", async () => {
    const result = await adminCaller.apiKeys.create({
      name: "Expiring Key",
      permissions: ["*"],
      rateLimit: 100,
      expiresInDays: 30,
    });
    expect(result.apiKey).toMatch(/^mt_live_/);
    // Clean up
    await adminCaller.apiKeys.delete({ id: result.id });
  });

  it("일반 사용자는 API 키를 생성할 수 없다", async () => {
    await expect(
      userCaller.apiKeys.create({
        name: "Unauthorized Key",
        permissions: ["*"],
        rateLimit: 100,
      })
    ).rejects.toThrow();
  });

  it("일반 사용자는 API 키 목록을 조회할 수 없다", async () => {
    await expect(userCaller.apiKeys.list()).rejects.toThrow();
  });

  it("admin이 API 키를 삭제할 수 있다", async () => {
    const result = await adminCaller.apiKeys.delete({ id: createdKeyId });
    expect(result.success).toBe(true);

    const keys = await adminCaller.apiKeys.list();
    const found = keys.find((k: any) => k.id === createdKeyId);
    expect(found).toBeUndefined();
  });
});

describe("v5.1 - 외부 REST API 라우터 구조", () => {
  it("createExternalApiRouter가 Express Router를 반환한다", () => {
    const router = createExternalApiRouter();
    expect(router).toBeDefined();
    expect(typeof router).toBe("function"); // Express router is a function
  });

  it("라우터에 올바른 엔드포인트가 등록되어 있다", () => {
    const router = createExternalApiRouter();
    // Express router has a stack of layers
    const stack = (router as any).stack;
    expect(Array.isArray(stack)).toBe(true);
    
    const routes = stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        method: Object.keys(layer.route.methods)[0],
        path: layer.route.path,
      }));

    // Verify key endpoints exist
    const paths = routes.map((r: any) => `${r.method}:${r.path}`);
    expect(paths).toContain("get:/meetups");
    expect(paths).toContain("get:/meetups/:id");
    expect(paths).toContain("get:/registrations");
    expect(paths).toContain("get:/registrations/:id");
    expect(paths).toContain("post:/registrations");
    expect(paths).toContain("put:/registrations/:id");
    expect(paths).toContain("get:/flights");
    expect(paths).toContain("get:/hotel-vouchers");
    expect(paths).toContain("get:/flight-tickets");
    expect(paths).toContain("get:/bookings/search-history");
    expect(paths).toContain("get:/stats");
    expect(paths).toContain("get:/");
  });
});

describe("v5.1 - 어필리에이트 설정 (tRPC)", () => {
  it("admin이 어필리에이트 설정을 저장할 수 있다", async () => {
    const result = await adminCaller.affiliate.upsertSetting({
      platform: "trip_com",
      affiliateId: "test_trip_123",
      isActive: true,
    });
    expect(result).toBeDefined();
  });

  it("admin이 어필리에이트 설정 목록을 조회할 수 있다", async () => {
    const settings = await adminCaller.affiliate.settings();
    expect(Array.isArray(settings)).toBe(true);
  });

  it("일반 사용자는 어필리에이트 설정을 변경할 수 없다", async () => {
    await expect(
      userCaller.affiliate.upsertSetting({
        platform: "trip_com",
        affiliateId: "hacker_id",
        isActive: true,
      })
    ).rejects.toThrow();
  });
});
