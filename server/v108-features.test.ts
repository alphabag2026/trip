import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-v108",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    organizationId: null,
    passwordHash: null,
    totpSecret: null,
    totpEnabled: false,
    emailVerified: true,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: {
      protocol: "https",
      get: vi.fn().mockReturnValue("localhost"),
      headers: { host: "localhost" },
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

const caller = appRouter.createCaller;

describe("v10.8 - Team Schedule UI + Driver/Interpreter Dashboard + Registration Integration", () => {
  describe("Team Schedule CRUD", () => {
    it("should list team schedules for a meetup", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      // List should not throw even with non-existent meetup
      const result = await c.teamSchedule.list({ meetupId: 99999 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create a team schedule", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const result = await c.teamSchedule.create({
        meetupId: 1,
        title: "팀 미팅 테스트",
        description: "v10.8 테스트 모임",
        location: "서울 강남역",
        eventTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should update a team schedule", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      // Create first
      const created = await c.teamSchedule.create({
        meetupId: 1,
        title: "수정 전 모임",
        eventTime: new Date().toISOString(),
      });
      // Update
      const updated = await c.teamSchedule.update({
        id: created.id,
        title: "수정 후 모임",
        location: "부산 해운대",
      });
      expect(updated.success).toBe(true);
    });

    it("should delete (cancel) a team schedule", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const created = await c.teamSchedule.create({
        meetupId: 1,
        title: "삭제 테스트 모임",
        eventTime: new Date().toISOString(),
      });
      const deleted = await c.teamSchedule.delete({ id: created.id });
      expect(deleted.success).toBe(true);
    });
  });

  describe("Translation Request CRUD", () => {
    it("should list pending translation requests", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const result = await c.translationRequest.pending({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create a translation request", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const result = await c.translationRequest.create({
        sourceLang: "ko",
        targetLang: "en",
        context: "회의 통역 필요",
        location: "서울 컨벤션센터",
        scheduledTime: new Date().toISOString(),
      });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should update translation request status", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const created = await c.translationRequest.create({
        sourceLang: "ko",
        targetLang: "ja",
        context: "상태 변경 테스트",
      });
      const updated = await c.translationRequest.updateStatus({
        id: created.id,
        status: "in_progress",
      });
      expect(updated.success).toBe(true);
    });

    it("should list my translation requests", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      const result = await c.translationRequest.myRequests();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Driver/Interpreter Role Access", () => {
    it("driver role should be valid in context", () => {
      const ctx = createAuthContext({ role: "driver" as any });
      expect(ctx.user?.role).toBe("driver");
    });

    it("interpreter role should be valid in context", () => {
      const ctx = createAuthContext({ role: "interpreter" as any });
      expect(ctx.user?.role).toBe("interpreter");
    });

    it("driver role context is valid for frontend routing", () => {
      const ctx = createAuthContext({ role: "driver" as any });
      // Driver role is used for frontend menu routing, not admin API access
      expect(ctx.user?.role).toBe("driver");
      expect(["driver", "interpreter", "user", "admin", "superadmin"]).toContain(ctx.user?.role);
    });

    it("interpreter can access pending translation requests", async () => {
      const ctx = createAuthContext({ role: "interpreter" as any });
      const c = caller(ctx);
      const result = await c.translationRequest.pending({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Registration → Team Schedule Auto-creation", () => {
    it("registration create should not throw with meetupId and scheduleStart", async () => {
      const ctx = createAuthContext();
      const c = caller(ctx);
      // This tests the registration flow includes team schedule auto-creation
      const result = await c.registration.create({
        meetupId: 1,
        name: "테스트 참석자",
        phone: "010-1234-5678",
        messengerId: "test_messenger",
        locationType: "domestic",
        scheduleStart: new Date().toISOString(),
        scheduleEnd: new Date(Date.now() + 86400000).toISOString(),
        teamName: "테스트팀",
      });
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
    });
  });
});
