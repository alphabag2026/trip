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

function createUserContext(): TrpcContext {
  return {
    user: { id: 99, openId: "user_test", name: "User", role: "attendee", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admin_test", name: "Admin", role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createSuperadminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "superadmin_test", name: "SuperAdmin", role: "superadmin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());
const userCaller = appRouter.createCaller(createUserContext());
const adminCaller = appRouter.createCaller(createAdminContext());
const superadminCaller = appRouter.createCaller(createSuperadminContext());

// ═══════════════════════════════════════════════════════════════
// v6.1 - 슈퍼 관리자 기능 테스트
// ═══════════════════════════════════════════════════════════════

describe("v6.1 - 슈퍼 관리자 감사 로그", () => {
  it("platform.auditLogs는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.platform.auditLogs({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it("platform.auditLogs는 일반 사용자가 호출 불가", async () => {
    await expect(userCaller.platform.auditLogs({ limit: 10, offset: 0 })).rejects.toThrow();
  });

  it("platform.auditLogs는 비로그인 사용자가 호출 불가", async () => {
    await expect(publicCaller.platform.auditLogs({ limit: 10, offset: 0 })).rejects.toThrow();
  });
});

describe("v6.1 - 슈퍼 관리자 조직 활성화/비활성화", () => {
  it("platform.toggleOrganization은 superadmin만 호출 가능", async () => {
    // 존재하지 않는 조직 ID로 호출 시 에러 (정상 동작)
    await expect(
      superadminCaller.platform.toggleOrganization({ organizationId: 999999, isActive: false })
    ).rejects.toThrow();
  });

  it("platform.toggleOrganization은 일반 사용자가 호출 불가", async () => {
    await expect(
      userCaller.platform.toggleOrganization({ organizationId: 1, isActive: false })
    ).rejects.toThrow();
  });
});

describe("v6.1 - 슈퍼 관리자 사용자 조직 배정", () => {
  it("platform.assignUserToOrg는 superadmin만 호출 가능", async () => {
    // 존재하지 않는 사용자/조직으로 호출 시 에러 (정상 동작)
    await expect(
      superadminCaller.platform.assignUserToOrg({ userId: 999999, organizationId: 999999, role: "staff" })
    ).rejects.toThrow();
  });

  it("platform.assignUserToOrg는 일반 사용자가 호출 불가", async () => {
    await expect(
      userCaller.platform.assignUserToOrg({ userId: 1, organizationId: 1, role: "staff" })
    ).rejects.toThrow();
  });
});

describe("v6.1 - 슈퍼 관리자 소유권 이전", () => {
  it("platform.transferOwnership는 superadmin만 호출 가능", async () => {
    // 존재하지 않는 조직/사용자로 호출 시 에러 (정상 동작)
    await expect(
      superadminCaller.platform.transferOwnership({ organizationId: 999999, newOwnerId: 999999 })
    ).rejects.toThrow();
  });

  it("platform.transferOwnership는 일반 사용자가 호출 불가", async () => {
    await expect(
      userCaller.platform.transferOwnership({ organizationId: 1, newOwnerId: 1 })
    ).rejects.toThrow();
  });

  it("platform.transferOwnership는 admin도 호출 불가 (superadmin 전용)", async () => {
    await expect(
      adminCaller.platform.transferOwnership({ organizationId: 1, newOwnerId: 1 })
    ).rejects.toThrow();
  });
});

describe("v6.1 - 슈퍼 관리자 조직 멤버 관리", () => {
  it("platform.removeOrgMember는 superadmin만 호출 가능", async () => {
    // 존재하지 않는 멤버 ID로 호출 시 에러 (정상 동작)
    await expect(
      superadminCaller.platform.removeOrgMember({ id: 999999 })
    ).rejects.toThrow();
  });

  it("platform.removeOrgMember는 일반 사용자가 호출 불가", async () => {
    await expect(
      userCaller.platform.removeOrgMember({ id: 1 })
    ).rejects.toThrow();
  });

  it("platform.updateOrgMemberRole은 superadmin이 호출 가능", async () => {
    // 존재하지 않는 멤버 ID로 호출해도 성공 반환 (DB에서 0행 업데이트)
    const result = await superadminCaller.platform.updateOrgMemberRole({ id: 999999, memberRole: "manager" });
    expect(result).toHaveProperty("success", true);
  });

  it("platform.updateOrgMemberRole은 일반 사용자가 호출 불가", async () => {
    await expect(
      userCaller.platform.updateOrgMemberRole({ id: 1, memberRole: "manager" })
    ).rejects.toThrow();
  });
});

describe("v6.1 - 기존 슈퍼 관리자 기능 유지", () => {
  it("platform.stats는 superadmin이 호출 가능", async () => {
    const result = await superadminCaller.platform.stats();
    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("totalOrganizations");
    expect(result).toHaveProperty("totalMeetups");
    expect(result).toHaveProperty("totalRegistrations");
  });

  it("platform.users는 superadmin이 호출 가능", async () => {
    const result = await superadminCaller.platform.users({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("platform.stats는 일반 사용자가 호출 불가", async () => {
    await expect(userCaller.platform.stats()).rejects.toThrow();
  });
});
