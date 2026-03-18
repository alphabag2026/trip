import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-user", email: "admin@test.com", name: "Admin",
    loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("v2.0 - Flight Schedule API", () => {
  it("should list flights (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.flight.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list delayed flights (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.flight.delayed();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Pickup Assignment API", () => {
  it("should list pickups (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pickup.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Accommodation API", () => {
  it("should list accommodations (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.accommodation.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Schedule Events API", () => {
  it("should list schedule events (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.schedule.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should trigger notifications (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.schedule.triggerNotifications();
    expect(result).toHaveProperty("triggered");
  });
});

describe("v2.0 - Pickup Photos API", () => {
  it("should list photos (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pickupPhoto.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Modification Requests API", () => {
  it("should list mod requests (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.modRequest.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Registration Status", () => {
  it("should list registrations with status filter (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({ status: "pending" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2.0 - Telegram API", () => {
  it("should get telegram config (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.telegram.getConfig();
    // result can be null or an object
    // result can be undefined, null, or an object
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});
