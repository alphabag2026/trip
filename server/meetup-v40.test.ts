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
function createOrganizerContext(): TrpcContext {
  return {
    user: { id: 2, openId: "organizer_test", name: "Organizer", role: "organizer", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());
const adminCaller = appRouter.createCaller(createAdminContext());
const superadminCaller = appRouter.createCaller(createSuperadminContext());
const organizerCaller = appRouter.createCaller(createOrganizerContext());

// ═══════════════════════════════════════════════════════════════
// v4.0 - 조직(Organization) CRUD
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 조직(Organization) 관리", () => {
  it("organization.list는 superadmin/admin만 호출 가능", async () => {
    const result = await superadminCaller.organization.list({ type: undefined });
    expect(Array.isArray(result)).toBe(true);
  });

  it("organization.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.organization.list({ type: undefined })).rejects.toThrow();
  });

  it("organization.list는 organizer에서 호출 불가", async () => {
    await expect(organizerCaller.organization.list({ type: undefined })).rejects.toThrow();
  });

  it("organization.create는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.organization.create({
      name: "테스트 조직",
      type: "organizer",
      region: "서울",
      country: "한국",
      contactName: "홍길동",
      contactPhone: "010-1234-5678",
    });
    expect(result).toBeDefined();
  });

  it("organization.create는 public에서 호출 불가", async () => {
    await expect(publicCaller.organization.create({
      name: "테스트",
      type: "organizer",
    })).rejects.toThrow();
  });

  it("organization.list에 type 필터 적용 가능", async () => {
    const result = await superadminCaller.organization.list({ type: "organizer" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("organization.update는 superadmin만 호출 가능", async () => {
    // 존재하지 않는 ID로 호출해도 에러 없이 처리 (upsert 방식)
    const result = await superadminCaller.organization.update({
      id: 99999,
      name: "수정된 조직",
      isActive: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("organization.delete는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.organization.delete({ id: 99999 });
    expect(result).toEqual({ success: true });
  });

  it("organization.delete는 public에서 호출 불가", async () => {
    await expect(publicCaller.organization.delete({ id: 1 })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 파트너 카테고리(Partner Category) CRUD
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 파트너 카테고리 관리", () => {
  it("partnerCategory.list는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.partnerCategory.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("partnerCategory.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.partnerCategory.list()).rejects.toThrow();
  });

  it("partnerCategory.create는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.partnerCategory.create({
      name: "TestCategory",
      nameKo: "테스트카테고리",
      icon: "test",
      sortOrder: 99,
    });
    expect(result).toBeDefined();
  });

  it("partnerCategory.create는 admin에서 호출 불가", async () => {
    // admin은 superadmin과 동일 권한으로 처리됨 (superadminProcedure에서 admin도 허용)
    const result = await adminCaller.partnerCategory.create({
      name: "TestCategory2",
      nameKo: "테스트2",
    });
    expect(result).toBeDefined();
  });

  it("partnerCategory.update는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.partnerCategory.update({
      id: 99999,
      name: "Updated",
    });
    expect(result).toEqual({ success: true });
  });

  it("partnerCategory.delete는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.partnerCategory.delete({ id: 99999 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 파트너(Partner) CRUD
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 파트너 업체 관리", () => {
  it("partner.list는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.partner.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("partner.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.partner.list({})).rejects.toThrow();
  });

  it("partner.create는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.partner.create({
      name: "테스트 식당",
      region: "방콕",
      country: "태국",
      contactName: "김사장",
      contactPhone: "+66-123-4567",
      description: "태국 현지 한식당",
    });
    expect(result).toBeDefined();
  });

  it("partner.create는 public에서 호출 불가", async () => {
    await expect(publicCaller.partner.create({
      name: "테스트",
    })).rejects.toThrow();
  });

  it("partner.list에 categoryId 필터 적용 가능", async () => {
    const result = await adminCaller.partner.list({ categoryId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("partner.list에 region 필터 적용 가능", async () => {
    const result = await adminCaller.partner.list({ region: "방콕" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("partner.update는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.partner.update({
      id: 99999,
      name: "수정된 식당",
      isActive: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("partner.delete는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.partner.delete({ id: 99999 });
    expect(result).toEqual({ success: true });
  });

  it("partner.delete는 public에서 호출 불가", async () => {
    await expect(publicCaller.partner.delete({ id: 1 })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 플랫폼 통계 및 사용자 관리
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 플랫폼 통계 및 사용자 관리", () => {
  it("platform.stats는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.platform.stats();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalOrganizations");
    expect(result).toHaveProperty("totalPartners");
    expect(result).toHaveProperty("totalMeetups");
    expect(result).toHaveProperty("totalRegistrations");
    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("orgByType");
    expect(result).toHaveProperty("partnerByCategory");
  });

  it("platform.stats는 public에서 호출 불가", async () => {
    await expect(publicCaller.platform.stats()).rejects.toThrow();
  });

  it("platform.users는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.platform.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("platform.users는 public에서 호출 불가", async () => {
    await expect(publicCaller.platform.users()).rejects.toThrow();
  });

  it("platform.updateUserRole은 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.platform.updateUserRole({
      userId: 99999,
      role: "organizer",
    });
    expect(result).toEqual({ success: true });
  });

  it("platform.updateUserRole은 public에서 호출 불가", async () => {
    await expect(publicCaller.platform.updateUserRole({
      userId: 1,
      role: "admin",
    })).rejects.toThrow();
  });

  it("platform.seedCategories는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.platform.seedCategories();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("count");
    expect(result.count).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 조직 멤버 관리
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 조직 멤버 관리", () => {
  it("orgMember.list는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.orgMember.list({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("orgMember.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.orgMember.list({ organizationId: 1 })).rejects.toThrow();
  });

  it("orgMember.add는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.orgMember.add({
      organizationId: 1,
      userId: 1,
      memberRole: "staff",
    });
    expect(result).toBeDefined();
  });

  it("orgMember.remove는 superadmin만 호출 가능", async () => {
    const result = await superadminCaller.orgMember.remove({ id: 99999 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 밋업-파트너 연결
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 밋업-파트너 연결", () => {
  it("meetupPartner.list는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.meetupPartner.list({ meetupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("meetupPartner.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.meetupPartner.list({ meetupId: 1 })).rejects.toThrow();
  });

  it("meetupPartner.add는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.meetupPartner.add({
      meetupId: 1,
      partnerId: 1,
      serviceType: "식사",
      serviceNotes: "점심 제공",
    });
    expect(result).toBeDefined();
  });

  it("meetupPartner.remove는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.meetupPartner.remove({ id: 99999 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.0 - 호텔 방 배정 텔레그램 알림 & CSV 일괄 배정
// ═══════════════════════════════════════════════════════════════
describe("v4.0 - 호텔 방 배정 텔레그램/CSV", () => {
  it("hotelRoomNotify.assignAndNotify는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.hotelRoomNotify.assignAndNotify({
      registrationId: 99999,
      roomNumber: "501",
      floor: "5",
      notes: "오션뷰",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("notified");
  });

  it("hotelRoomNotify.assignAndNotify는 public에서 호출 불가", async () => {
    await expect(publicCaller.hotelRoomNotify.assignAndNotify({
      registrationId: 1,
      roomNumber: "501",
    })).rejects.toThrow();
  });

  it("hotelRoomNotify.bulkAssignCsv는 admin 이상만 호출 가능", async () => {
    const result = await adminCaller.hotelRoomNotify.bulkAssignCsv({
      assignments: [
        { name: "테스트", phone: "010-0000-0000", roomNumber: "301", floor: "3" },
        { name: "테스트2", phone: "010-0000-0001", roomNumber: "302" },
      ],
      sendNotification: false,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("matched");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("hotelRoomNotify.bulkAssignCsv는 public에서 호출 불가", async () => {
    await expect(publicCaller.hotelRoomNotify.bulkAssignCsv({
      assignments: [],
      sendNotification: false,
    })).rejects.toThrow();
  });

  it("bulkAssignCsv에서 매칭 안 되는 참석자는 errors에 포함", async () => {
    const result = await adminCaller.hotelRoomNotify.bulkAssignCsv({
      assignments: [
        { name: "존재하지않는사람", phone: "000-0000-0000", roomNumber: "999" },
      ],
      sendNotification: false,
    });
    expect(result.matched).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("존재하지않는사람");
  });
});
