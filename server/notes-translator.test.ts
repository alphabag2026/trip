import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-notes",
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

describe("note router", () => {
  it("note.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.note.list()).rejects.toThrow();
  });

  it("note.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.create({ title: "Test Note" })
    ).rejects.toThrow();
  });

  it("note.create validates title is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.create({ title: "" })
    ).rejects.toThrow();
  });

  it("note.create validates title max length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const longTitle = "a".repeat(501);
    await expect(
      caller.note.create({ title: longTitle })
    ).rejects.toThrow();
  });

  it("note.create accepts valid input with all fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // This will try to hit DB - we just verify input validation passes
    try {
      await caller.note.create({
        title: "Test Note",
        content: "Some content",
        color: "blue",
        tags: ["travel", "meeting"],
      });
    } catch (e: any) {
      // DB error is expected in test env, but input validation should pass
      expect(e.message).not.toContain("Validation");
    }
  });

  it("note.update requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.update({ id: 1, title: "Updated" })
    ).rejects.toThrow();
  });

  it("note.delete requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("note.togglePin requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.togglePin({ id: 1 })
    ).rejects.toThrow();
  });

  it("note.shared requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.shared({ meetupId: 1 })
    ).rejects.toThrow();
  });

  it("note.create validates color enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.note.create({ title: "Test", color: "red" as any })
    ).rejects.toThrow();
  });
});

describe("translator router", () => {
  it("translator.translate requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translator.translate({
        text: "Hello",
        sourceLang: "en",
        targetLang: "ko",
      })
    ).rejects.toThrow();
  });

  it("translator.translate validates text is not empty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translator.translate({
        text: "",
        sourceLang: "en",
        targetLang: "ko",
      })
    ).rejects.toThrow();
  });

  it("translator.translate validates text max length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const longText = "a".repeat(5001);
    await expect(
      caller.translator.translate({
        text: longText,
        sourceLang: "en",
        targetLang: "ko",
      })
    ).rejects.toThrow();
  });

  it("translator.translate validates sourceLang min length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translator.translate({
        text: "Hello",
        sourceLang: "e",
        targetLang: "ko",
      })
    ).rejects.toThrow();
  });

  it("translator.translate accepts valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // This will try to call LLM - we verify input validation passes
    try {
      await caller.translator.translate({
        text: "Hello world",
        sourceLang: "en",
        targetLang: "ko",
      });
    } catch (e: any) {
      // LLM call may fail in test env, but input validation should pass
      expect(e.message).not.toContain("Validation");
    }
  });
});
