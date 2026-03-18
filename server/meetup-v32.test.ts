import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@test.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("v3.2 - 10분 전 알림 자동화", () => {
  it("schedule.checkAndNotify should be callable by admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.schedule.checkAndNotify();
    expect(result).toHaveProperty("triggered");
    expect(typeof result.triggered).toBe("number");
  });

  it("schedule.triggerNotifications should be callable by admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.schedule.triggerNotifications();
    expect(result).toHaveProperty("triggered");
  });
});

describe("v3.2 - 실시간 항공편 지연 및 픽업 안내", () => {
  it("flight.myFlights should return empty array for non-existent registration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.flight.getMyFlights({ registrationId: 99999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("pickup.myPickup should return null for non-existent registration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pickup.getMyPickup({ registrationId: 99999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("flight.updateStatus should be callable by admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw even with non-existent ID
    await expect(
      caller.flight.update({ id: 99999, flightStatus: "delayed", delayMinutes: 30 })
    ).resolves.toBeDefined();
  });
});

describe("v3.2 - 백오피스 실시간 채팅", () => {
  it("channel.list should return array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.channel.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("message.send should create a message in a channel", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // First create a channel
    const channel = await caller.channel.create({
      meetupId: 1,
      channelName: "테스트 채팅 채널",
      channelType: "general",
    });
    expect(channel).toHaveProperty("id");

    // Send a message
    const msg = await caller.message.send({
      channelId: channel.id,
      senderName: "관리자",
      senderRole: "admin",
      content: "테스트 메시지입니다",
    });
    expect(msg).toHaveProperty("id");

    // List messages
    const messages = await caller.message.list({ channelId: channel.id, limit: 10 });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const found = messages.find((m: any) => m.content === "테스트 메시지입니다");
    expect(found).toBeDefined();
  });

  it("message.markRead should work without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Create channel first
    const channel = await caller.channel.create({
      meetupId: 1,
      channelName: "읽음 테스트 채널",
      channelType: "manager",
    });
    await expect(
      caller.message.markRead({ channelId: channel.id })
    ).resolves.toBeDefined();
  });
});

describe("v3.2 - 스케줄 뷰 실시간 갱신", () => {
  it("schedule.list should return events for a meetup", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const events = await caller.schedule.list({ meetupId: 1 });
    expect(Array.isArray(events)).toBe(true);
  });
});
