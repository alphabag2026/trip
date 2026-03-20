import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createSuperadminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "superadmin_v41", name: "SuperAdmin", role: "superadmin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}
function createAdminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admin_v41", name: "Admin", role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const superadminCaller = appRouter.createCaller(createSuperadminContext());
const adminCaller = appRouter.createCaller(createAdminContext());

// ═══════════════════════════════════════════════════════════════
// v4.1 - 도넛 차트용 통계 데이터 검증
// ═══════════════════════════════════════════════════════════════
describe("v4.1 - 플랫폼 통계 (도넛 차트 데이터)", () => {
  it("platform.stats가 orgByType 배열을 반환한다", async () => {
    const stats = await superadminCaller.platform.stats();
    expect(stats).toHaveProperty("orgByType");
    expect(Array.isArray(stats.orgByType)).toBe(true);
  });

  it("orgByType 각 항목은 type과 count를 포함한다", async () => {
    const stats = await superadminCaller.platform.stats();
    for (const item of stats.orgByType) {
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("count");
    }
  });

  it("platform.stats가 partnerByCategory 배열을 반환한다", async () => {
    const stats = await superadminCaller.platform.stats();
    expect(stats).toHaveProperty("partnerByCategory");
    expect(Array.isArray(stats.partnerByCategory)).toBe(true);
  });

  it("platform.stats가 totalOrganizations를 반환한다", async () => {
    const stats = await superadminCaller.platform.stats();
    expect(typeof stats.totalOrganizations).toBe("number");
  });

  it("platform.stats가 totalPartners를 반환한다", async () => {
    const stats = await superadminCaller.platform.stats();
    expect(typeof stats.totalPartners).toBe("number");
  });

  it("platform.stats가 totalUsers를 반환한다", async () => {
    const stats = await superadminCaller.platform.stats();
    expect(typeof stats.totalUsers).toBe("number");
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.1 - 파트너 목록 정렬 검증
// ═══════════════════════════════════════════════════════════════
describe("v4.1 - 파트너 목록 (정렬 기능 지원)", () => {
  it("partner.list가 rating 필드를 포함하는 배열을 반환한다", async () => {
    const partners = await adminCaller.partner.list({});
    expect(Array.isArray(partners)).toBe(true);
    // 파트너가 있으면 rating 필드 확인
    for (const p of partners) {
      expect(p).toHaveProperty("rating");
    }
  });

  it("partner.list가 capacity 필드를 포함하는 배열을 반환한다", async () => {
    const partners = await adminCaller.partner.list({});
    for (const p of partners) {
      expect(p).toHaveProperty("capacity");
    }
  });

  it("partner.list가 name 필드를 포함하는 배열을 반환한다", async () => {
    const partners = await adminCaller.partner.list({});
    for (const p of partners) {
      expect(p).toHaveProperty("name");
    }
  });

  it("partner.list를 categoryId로 필터링할 수 있다", async () => {
    // 존재하지 않는 categoryId로 필터링하면 빈 배열
    const partners = await adminCaller.partner.list({ categoryId: 99999 });
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.length).toBe(0);
  });

  it("partner.list를 region으로 필터링할 수 있다", async () => {
    const partners = await adminCaller.partner.list({ region: "nonexistent_region_xyz" });
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.1 - 사용자 역할 변경 API 검증
// ═══════════════════════════════════════════════════════════════
describe("v4.1 - 사용자 역할 변경 (확인 모달 지원)", () => {
  it("platform.users가 사용자 목록을 반환한다", async () => {
    const users = await superadminCaller.platform.users();
    expect(Array.isArray(users)).toBe(true);
  });

  it("platform.users 각 항목이 id, name, role을 포함한다", async () => {
    const users = await superadminCaller.platform.users();
    for (const u of users) {
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("role");
    }
  });

  it("platform.updateUserRole은 유효한 역할만 허용한다", async () => {
    // 유효하지 않은 역할로 변경 시도
    await expect(
      superadminCaller.platform.updateUserRole({ userId: 1, role: "invalid_role" as any })
    ).rejects.toThrow();
  });

  it("platform.updateUserRole은 admin도 호출 가능하다", async () => {
    const result = await adminCaller.platform.updateUserRole({ userId: 1, role: "user" });
    expect(result).toHaveProperty("success", true);
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.1 - 파트너 카테고리 목록 검증
// ═══════════════════════════════════════════════════════════════
describe("v4.1 - 파트너 카테고리 목록", () => {
  it("partnerCategory.list가 배열을 반환한다", async () => {
    const cats = await adminCaller.partnerCategory.list();
    expect(Array.isArray(cats)).toBe(true);
  });

  it("partnerCategory.list 각 항목이 id, name을 포함한다", async () => {
    const cats = await adminCaller.partnerCategory.list();
    for (const c of cats) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
    }
  });
});
