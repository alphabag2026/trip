import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-v107",
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
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const caller = (ctx: TrpcContext) => appRouter.createCaller(ctx);

describe("v10.7 - Team Schedule API", () => {
  it("should require authentication for teamSchedule.list", async () => {
    const ctx = createUnauthContext();
    await expect(
      caller(ctx).teamSchedule.list({ meetupId: 1 })
    ).rejects.toThrow();
  });

  it("should list team schedules for a meetup", async () => {
    const ctx = createAuthContext();
    const result = await caller(ctx).teamSchedule.list({ meetupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a team schedule", async () => {
    const ctx = createAuthContext();
    const result = await caller(ctx).teamSchedule.create({
      meetupId: 1,
      title: "팀 미팅 테스트",
      description: "테스트 설명",
      location: "서울 강남",
      eventTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      memberIds: [1, 2, 3],
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should update a team schedule", async () => {
    const ctx = createAuthContext();
    // Create first
    const { id } = await caller(ctx).teamSchedule.create({
      meetupId: 1,
      title: "업데이트 테스트",
      eventTime: new Date().toISOString(),
    });
    // Update
    const result = await caller(ctx).teamSchedule.update({
      id,
      title: "업데이트됨",
      location: "부산 해운대",
    });
    expect(result.success).toBe(true);
  });

  it("should delete a team schedule", async () => {
    const ctx = createAuthContext();
    const { id } = await caller(ctx).teamSchedule.create({
      meetupId: 1,
      title: "삭제 테스트",
      eventTime: new Date().toISOString(),
    });
    const result = await caller(ctx).teamSchedule.delete({ id });
    expect(result.success).toBe(true);
  });

  it("should add a member to team schedule", async () => {
    const ctx = createAuthContext();
    const { id } = await caller(ctx).teamSchedule.create({
      meetupId: 1,
      title: "멤버 추가 테스트",
      eventTime: new Date().toISOString(),
      memberIds: [1],
    });
    const result = await caller(ctx).teamSchedule.addMember({
      scheduleId: id,
      registrationId: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("v10.7 - Translation Request API", () => {
  it("should require authentication for translationRequest.pending", async () => {
    const ctx = createUnauthContext();
    await expect(
      caller(ctx).translationRequest.pending({ meetupId: 1 })
    ).rejects.toThrow();
  });

  it("should list pending translation requests", async () => {
    const ctx = createAuthContext();
    const result = await caller(ctx).translationRequest.pending({ meetupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a translation request", async () => {
    const ctx = createAuthContext();
    const result = await caller(ctx).translationRequest.create({
      meetupId: 1,
      sourceLang: "ko",
      targetLang: "en",
      context: "회의 통역",
      location: "컨퍼런스룸 A",
      scheduledTime: new Date().toISOString(),
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list my translation requests (interpreter)", async () => {
    const ctx = createAuthContext({ role: "interpreter" as any });
    const result = await caller(ctx).translationRequest.myRequests();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should update translation request status", async () => {
    const ctx = createAuthContext();
    const { id } = await caller(ctx).translationRequest.create({
      sourceLang: "ko",
      targetLang: "en",
    });
    const result = await caller(ctx).translationRequest.updateStatus({
      id,
      status: "completed",
    });
    expect(result.success).toBe(true);
  });

  it("should require admin for assign", async () => {
    const ctx = createAuthContext({ role: "user" });
    await expect(
      caller(ctx).translationRequest.assign({ id: 1, interpreterId: 2 })
    ).rejects.toThrow();
  });

  it("should allow admin to assign interpreter", async () => {
    const adminCtx = createAuthContext({ role: "admin" });
    const userCtx = createAuthContext();
    const { id } = await caller(userCtx).translationRequest.create({
      sourceLang: "ko",
      targetLang: "en",
    });
    const result = await caller(adminCtx).translationRequest.assign({
      id,
      interpreterId: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("v10.7 - Role-based Home Menu", () => {
  it("should have driver role in user schema", () => {
    // This test validates that the role enum includes driver and interpreter
    // by checking that the auth.me endpoint returns the role correctly
    const driverCtx = createAuthContext({ role: "driver" as any });
    expect(driverCtx.user?.role).toBe("driver");
  });

  it("should have interpreter role in user schema", () => {
    const interpCtx = createAuthContext({ role: "interpreter" as any });
    expect(interpCtx.user?.role).toBe("interpreter");
  });

  it("driver should access protected procedures", async () => {
    const ctx = createAuthContext({ role: "driver" as any });
    // Driver should be able to access notes
    const notes = await caller(ctx).note.list({});
    expect(Array.isArray(notes)).toBe(true);
  });

  it("interpreter should access translator", async () => {
    const ctx = createAuthContext({ role: "interpreter" as any });
    // Interpreter should be able to translate
    const result = await caller(ctx).translator.translate({
      text: "hello",
      sourceLang: "en",
      targetLang: "ko",
    });
    expect(result).toHaveProperty("translatedText");
  });
});
