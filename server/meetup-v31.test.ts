import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-user", email: "admin@test.com", name: "Admin",
      loginMethod: "manus", role: "admin", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("v3.1 - Travel Info Auto-Generation", () => {
  it("generateInfo requires admin access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.travelInfo.generateInfo({ countryCode: "TH", countryName: "Thailand" })
    ).rejects.toThrow();
  });

  it("sendToParticipants requires admin access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.travelInfo.sendToParticipants({ countryCode: "TH", method: "telegram" })
    ).rejects.toThrow();
  });

  it("travelInfo.list is accessible publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.travelInfo.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v3.1 - Passport OCR Export", () => {
  it("exportPassportOcr requires admin access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.registration.exportPassportOcr({})
    ).rejects.toThrow();
  });

  it("exportPassportOcr returns array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.exportPassportOcr({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v3.1 - Assignment Confirmation with Notification", () => {
  it("confirm accepts registrationId and type", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // confirm updates DB and sends notification - returns success even for non-existent IDs
    const result = await caller.assignment.confirm({ registrationId: 999999, type: "flight" });
    expect(result).toEqual({ success: true });
  });

  it("confirmationStatus requires admin access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.assignment.confirmationStatus({})
    ).rejects.toThrow();
  });

  it("confirmationStatus returns array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.assignment.confirmationStatus({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v3.1 - Registration Filters", () => {
  it("registration.list supports date filters", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("registration.list supports category filter", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({
      category: "meetup",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("registration.list supports status filter", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({
      status: "approved",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("registration.list supports combined filters", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({
      category: "meetup",
      status: "approved",
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      search: "test",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
