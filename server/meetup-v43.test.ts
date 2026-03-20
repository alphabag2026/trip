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
function createUserContext(id = 300, role: string = "user"): TrpcContext {
  return {
    user: { id, openId: `user_${id}`, name: `User${id}`, role: role as any, avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());
const userCaller = appRouter.createCaller(createUserContext(300, "user"));
const adminCaller = appRouter.createCaller(createUserContext(301, "admin"));
const superadminCaller = appRouter.createCaller(createUserContext(305, "superadmin"));
const organizerCaller = appRouter.createCaller(createUserContext(302, "organizer"));
const agencyCaller = appRouter.createCaller(createUserContext(303, "agency"));
const partnerCaller = appRouter.createCaller(createUserContext(304, "partner"));

// ═══════════════════════════════════════════════════════════════
// v4.3 - 온보딩 상태 확인
// ═══════════════════════════════════════════════════════════════
describe("v4.3 - 온보딩 상태", () => {
  it("onboardingStatus는 인증된 사용자만 호출 가능", async () => {
    await expect(publicCaller.userProfile.onboardingStatus()).rejects.toThrow();
  });

  it("onboardingStatus는 인증된 사용자가 호출 가능", async () => {
    const result = await userCaller.userProfile.onboardingStatus();
    expect(result).toBeDefined();
    expect(typeof result.onboardingCompleted).toBe("boolean");
  });

  it("completeOnboarding으로 온보딩 완료 처리", async () => {
    // 먼저 프로필 생성
    await userCaller.userProfile.upsert({ phone: "+82-10-0000-0000" });
    const result = await userCaller.userProfile.completeOnboarding();
    expect(result.success).toBe(true);
  });

  it("온보딩 완료 후 상태 확인", async () => {
    const status = await userCaller.userProfile.onboardingStatus();
    expect(status.onboardingCompleted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.3 - 초대 시스템 (Invitations)
// ═══════════════════════════════════════════════════════════════
describe("v4.3 - 초대 시스템", () => {
  let orgId: number;
  let inviteToken: string;

  it("초대 생성을 위해 먼저 조직 생성", async () => {
    const org = await adminCaller.organization.create({
      name: "테스트 에이전시 v43",
      type: "agency",
      region: "서울",
    });
    expect(org?.id).toBeDefined();
    orgId = org!.id;
  });

  it("조직 멤버 추가 (admin을 owner로)", async () => {
    const result = await superadminCaller.orgMember.add({
      organizationId: orgId,
      userId: 301,
      memberRole: "owner",
    });
    expect(result).toBeDefined();
  });

  it("초대 생성 - owner/manager만 가능", async () => {
    const result = await adminCaller.invitation.create({
      organizationId: orgId,
      email: "newmember@test.com",
      memberRole: "staff",
      message: "우리 팀에 합류하세요!",
    });
    expect(result?.id).toBeDefined();
  });

  it("초대 목록 조회", async () => {
    const invites = await adminCaller.invitation.listByOrg({ organizationId: orgId });
    expect(invites.length).toBeGreaterThan(0);
    inviteToken = invites[0].inviteToken;
  });

  it("초대 토큰으로 조회 (공개)", async () => {
    const invite = await publicCaller.invitation.getByToken({ token: inviteToken });
    expect(invite).toBeDefined();
    expect(invite.organization).toBeDefined();
    expect(invite.memberRole).toBe("staff");
  });

  it("초대 수락", async () => {
    const result = await organizerCaller.invitation.accept({ token: inviteToken });
    expect(result.success).toBe(true);
  });

  it("이미 수락된 초대 재수락 불가", async () => {
    await expect(organizerCaller.invitation.accept({ token: inviteToken })).rejects.toThrow();
  });

  it("새 초대 생성 후 취소", async () => {
    const inv = await adminCaller.invitation.create({
      organizationId: orgId,
      memberRole: "viewer",
    });
    expect(inv?.id).toBeDefined();
    if (inv?.id) {
      const result = await adminCaller.invitation.cancel({ id: inv.id });
      expect(result.success).toBe(true);
    }
  });

  it("존재하지 않는 토큰 조회 시 에러", async () => {
    await expect(publicCaller.invitation.getByToken({ token: "nonexistent_token_xyz" })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.3 - 역할별 대시보드
// ═══════════════════════════════════════════════════════════════
describe("v4.3 - 역할별 대시보드", () => {
  it("roleDashboard.organizer는 인증된 사용자만 호출 가능", async () => {
    await expect(publicCaller.roleDashboard.organizer()).rejects.toThrow();
  });

  it("organizer 대시보드 데이터 조회", async () => {
    const data = await organizerCaller.roleDashboard.organizer();
    expect(data).toBeDefined();
    expect(Array.isArray(data.meetups)).toBe(true);
    expect(typeof data.totalAttendees).toBe("number");
    expect(typeof data.pendingRegistrations).toBe("number");
  });

  it("roleDashboard.agency는 인증된 사용자만 호출 가능", async () => {
    await expect(publicCaller.roleDashboard.agency()).rejects.toThrow();
  });

  it("agency 대시보드 데이터 조회", async () => {
    const data = await agencyCaller.roleDashboard.agency();
    expect(data).toBeDefined();
    expect(Array.isArray(data.partners)).toBe(true);
    expect(Array.isArray(data.members)).toBe(true);
  });

  it("roleDashboard.partner는 인증된 사용자만 호출 가능", async () => {
    await expect(publicCaller.roleDashboard.partner()).rejects.toThrow();
  });

  it("partner 대시보드 데이터 조회", async () => {
    const data = await partnerCaller.roleDashboard.partner();
    expect(data).toBeDefined();
    expect(Array.isArray(data.meetupPartners)).toBe(true);
    expect(typeof data.totalServices).toBe("number");
  });

  it("일반 사용자도 organizer 대시보드 조회 가능", async () => {
    const data = await userCaller.roleDashboard.organizer();
    expect(data).toBeDefined();
  });
});
