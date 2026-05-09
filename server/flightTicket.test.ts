import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext() {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    avatarUrl: null,
    passwordHash: null,
    totpSecret: null,
    totpEnabled: false,
    emailVerified: true,
    createdAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    ctx: {
      user,
      req: { headers: { host: "localhost:3000" }, protocol: "http" } as any,
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    } as TrpcContext,
  };
}

describe("flightTicket router", () => {
  it("bulkDelete requires array of IDs", async () => {
    const caller = appRouter.createCaller(createAdminContext().ctx);
    // Should throw if empty array
    await expect(
      caller.flightTicket.bulkDelete({ ids: [] })
    ).rejects.toThrow();
  });

  it("deleteAll requires confirmation flag", async () => {
    const caller = appRouter.createCaller(createAdminContext().ctx);
    // Should throw if confirm is false
    await expect(
      caller.flightTicket.deleteAll({ confirm: false })
    ).rejects.toThrow();
  });
});

describe("aiExtract router - flightTicket context", () => {
  it("analyzePrompt accepts flightTicket context", async () => {
    const caller = appRouter.createCaller(createAdminContext().ctx);
    // Should not throw on valid input (will fail on LLM call but validates schema)
    try {
      await caller.aiExtract.analyzePrompt({
        prompt: "KE441 ICN to HAN 2025-05-10 09:00 passenger HONG GILDONG M12345678",
        context: "flightTicket",
      });
    } catch (e: any) {
      // LLM call may fail in test env, but input validation should pass
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("analyzePrompt accepts vehicle context with pickup info", async () => {
    const caller = appRouter.createCaller(createAdminContext().ctx);
    try {
      await caller.aiExtract.analyzePrompt({
        prompt: "Toyota Alphard 51가1234 white van 15인승 기사 김철수 010-1234-5678 공항 터미널1 도착 게이트 14:00",
        context: "vehicle",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  }, 15000);
});
