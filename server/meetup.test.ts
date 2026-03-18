import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getMeetups: vi.fn().mockResolvedValue([
    { id: 1, title: "서울 밋업", type: "meetup", locationType: "domestic", status: "open" },
    { id: 2, title: "방콕 밋업", type: "meetup", locationType: "overseas", status: "draft" },
  ]),
  getMeetupById: vi.fn().mockResolvedValue({ id: 1, title: "서울 밋업", type: "meetup" }),
  createMeetup: vi.fn().mockResolvedValue(3),
  updateMeetup: vi.fn().mockResolvedValue(undefined),
  deleteMeetup: vi.fn().mockResolvedValue(undefined),
  getRegistrations: vi.fn().mockResolvedValue([
    { id: 1, name: "홍길동", phone: "010-1234-5678", messengerId: "hong_tg", locationType: "overseas", status: "pending" },
  ]),
  getRegistrationById: vi.fn().mockResolvedValue({ id: 1, name: "홍길동", phone: "010-1234-5678" }),
  getRegistrationStats: vi.fn().mockResolvedValue({ total: 10, pending: 3, approved: 5, domestic: 4, overseas: 6 }),
  createRegistration: vi.fn().mockResolvedValue(1),
  updateRegistration: vi.fn().mockResolvedValue(undefined),
  deleteRegistration: vi.fn().mockResolvedValue(undefined),
  getRegistrationByNameAndPhone: vi.fn().mockResolvedValue({ id: 1, name: "홍길동", phone: "010-1234-5678" }),
  getTelegramConfig: vi.fn().mockResolvedValue(null),
  getTravelInfoList: vi.fn().mockResolvedValue([]),
  getTravelInfoByCountry: vi.fn().mockResolvedValue(null),
  upsertTravelInfo: vi.fn().mockResolvedValue(undefined),
  deleteTravelInfo: vi.fn().mockResolvedValue(undefined),
  getAllItineraries: vi.fn().mockResolvedValue([]),
  getItinerariesByRegistration: vi.fn().mockResolvedValue([]),
  getItineraryById: vi.fn().mockResolvedValue(null),
  createItinerary: vi.fn().mockResolvedValue(1),
  updateItinerary: vi.fn().mockResolvedValue(undefined),
  deleteItinerary: vi.fn().mockResolvedValue(undefined),
  upsertTelegramConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test.jpg" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"fullName":"Hong Gildong","passportNumber":"M12345678"}' } }],
  }),
}));

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
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "regular-user", email: "user@test.com", name: "User",
    loginMethod: "manus", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("meetup router", () => {
  it("lists meetups (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetup.list();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("서울 밋업");
  });

  it("gets meetup by id (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetup.getById({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.title).toBe("서울 밋업");
  });

  it("creates meetup (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.meetup.create({ title: "새 밋업", type: "meetup", locationType: "domestic" });
    expect(result).toHaveProperty("id");
  });

  it("rejects meetup creation for non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.meetup.create({ title: "새 밋업" })).rejects.toThrow();
  });

  it("updates meetup (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.meetup.update({ id: 1, status: "closed" });
    expect(result).toEqual({ success: true });
  });

  it("deletes meetup (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.meetup.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("registration router", () => {
  it("creates registration (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.create({
      name: "홍길동", phone: "010-1234-5678", messengerId: "hong_tg",
      locationType: "overseas", category: "meetup",
    });
    expect(result).toHaveProperty("id");
  });

  it("lists registrations (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list({});
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("홍길동");
  });

  it("rejects registration list for non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.registration.list({})).rejects.toThrow();
  });

  it("gets registration stats (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.stats();
    expect(result.total).toBe(10);
    expect(result.pending).toBe(3);
  });

  it("looks up registration by name and phone (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.lookup({ name: "홍길동", phone: "010-1234-5678" });
    expect(result).toBeDefined();
    expect(result?.name).toBe("홍길동");
  });

  it("updates registration status (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.update({ id: 1, status: "approved" });
    expect(result).toEqual({ success: true });
  });

  it("deletes registration (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("travelInfo router", () => {
  it("lists travel info (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.travelInfo.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("upserts travel info (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.travelInfo.upsert({
      countryCode: "TH", countryName: "Thailand",
      countryNameKo: "태국", visaRequired: false,
      requiredItems: ["여권", "여행자보험"],
    });
    expect(result).toEqual({ success: true });
  });
});

describe("telegram router", () => {
  it("rejects config access for non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.telegram.getConfig()).rejects.toThrow();
  });

  it("updates telegram config (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.telegram.updateConfig({
      botToken: "test-token", chatId: "-1001234567890", enabled: true,
    });
    expect(result).toEqual({ success: true });
  });
});
