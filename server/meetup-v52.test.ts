import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(id = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("v5.2 - Telegram Upload System", () => {
  it("should have telegramUpload router defined", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.telegramUpload).toBeDefined();
  });

  it("should have list procedure in telegramUpload router", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.telegramUpload.list).toBeDefined();
  });

  it("should list telegram uploads (empty initially)", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.telegramUpload.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have processUpload procedure", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.telegramUpload.processUpload).toBeDefined();
  });

  it("should have applyToSystem procedure", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.telegramUpload.applyToSystem).toBeDefined();
  });

  it("should reject non-admin access to telegramUpload.list", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    await expect(userCaller.telegramUpload.list({})).rejects.toThrow();
  });
});

describe("v5.2 - Community Chat System", () => {
  it("should have chatRoom router defined", () => {
    const userCaller = appRouter.createCaller(createUserContext());
    expect(userCaller.chatRoom).toBeDefined();
  });

  it("should have list procedure", () => {
    const userCaller = appRouter.createCaller(createUserContext());
    expect(userCaller.chatRoom.list).toBeDefined();
  });

  it("should list community rooms", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    const result = await userCaller.chatRoom.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have create procedure for admin", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.chatRoom.create).toBeDefined();
  });

  it("should create a community room", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const room = await adminCaller.chatRoom.create({
      name: "Test Room",
      description: "A test community room",
      roomType: "general",
    });
    expect(room).toBeDefined();
    expect(room.id).toBeDefined();
  });

  it("should have chatMessage.send procedure", () => {
    const userCaller = appRouter.createCaller(createUserContext());
    expect(userCaller.chatMessage.send).toBeDefined();
  });

  it("should have chatMessage.list procedure", () => {
    const userCaller = appRouter.createCaller(createUserContext());
    expect(userCaller.chatMessage.list).toBeDefined();
  });

  it("should reject unauthenticated access", async () => {
    const anonCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const anonCaller = appRouter.createCaller(anonCtx);
    await expect(anonCaller.chatRoom.list({})).rejects.toThrow();
  });
});

describe("v5.2 - API Logs Filtered", () => {
  it("should have logsFiltered procedure in apiKeys router", () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    expect(adminCaller.apiKeys.logsFiltered).toBeDefined();
  });

  it("should query filtered logs with date range", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.apiKeys.logsFiltered({
      apiKeyId: 999999,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      limit: 10,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0); // No logs for non-existent key
  });

  it("should query filtered logs without dates", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.apiKeys.logsFiltered({
      apiKeyId: 999999,
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should reject non-admin access to logsFiltered", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    await expect(
      userCaller.apiKeys.logsFiltered({ apiKeyId: 1 })
    ).rejects.toThrow();
  });
});

describe("v5.2 - Router Structure Integrity", () => {
  it("should have all v5.2 routers in appRouter", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(caller.telegramUpload).toBeDefined();
    expect(caller.chatRoom).toBeDefined();
    expect(caller.chatMessage).toBeDefined();
    expect(caller.apiKeys).toBeDefined();
  });

  it("should maintain existing routers", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(caller.auth).toBeDefined();
    expect(caller.userProfile).toBeDefined();
    expect(caller.passport).toBeDefined();
    expect(caller.meetup).toBeDefined();
  });
});
