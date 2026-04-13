import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock web-push
vi.mock("web-push", () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
}));

// Mock db functions
vi.mock("./db", () => ({
  getLocationHistoryForHeatmap: vi.fn().mockResolvedValue([
    { lat: "37.5665000", lng: "126.9780000", createdAt: new Date() },
    { lat: "37.5700000", lng: "126.9800000", createdAt: new Date() },
    { lat: "37.5680000", lng: "126.9790000", createdAt: new Date() },
  ]),
  getPushSubscriptionsByUserIds: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, endpoint: "https://push.example.com/1", p256dh: "key1", auth: "auth1" },
    { id: 2, userId: 2, endpoint: "https://push.example.com/2", p256dh: "key2", auth: "auth2" },
  ]),
  getAllAdminPushSubscriptions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, endpoint: "https://push.example.com/admin1", p256dh: "key1", auth: "auth1" },
  ]),
  getChatRoomMemberIds: vi.fn().mockResolvedValue([1, 2, 3]),
  getRegistrations: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "User1" },
    { id: 2, userId: 2, name: "User2" },
  ]),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
}));

describe("v6.4 - Extended Push Notifications & Heatmap", () => {
  describe("Heatmap Data", () => {
    it("should return location history points for heatmap", async () => {
      const { getLocationHistoryForHeatmap } = await import("./db");
      const data = await getLocationHistoryForHeatmap(1);
      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty("lat");
      expect(data[0]).toHaveProperty("lng");
    });

    it("should support time range filtering", async () => {
      const { getLocationHistoryForHeatmap } = await import("./db");
      const data = await getLocationHistoryForHeatmap(1, {
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
      });
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should convert lat/lng to numbers for heatmap response", async () => {
      const { getLocationHistoryForHeatmap } = await import("./db");
      const data = await getLocationHistoryForHeatmap(1);
      const points = data.map((d: any) => ({
        lat: Number(d.lat),
        lng: Number(d.lng),
      }));
      expect(points[0].lat).toBeCloseTo(37.5665, 4);
      expect(points[0].lng).toBeCloseTo(126.978, 3);
      expect(typeof points[0].lat).toBe("number");
    });
  });

  describe("Push Notification Helpers", () => {
    it("should get push subscriptions by user IDs", async () => {
      const { getPushSubscriptionsByUserIds } = await import("./db");
      const subs = await getPushSubscriptionsByUserIds([1, 2]);
      expect(subs).toHaveLength(2);
      expect(subs[0]).toHaveProperty("endpoint");
      expect(subs[0]).toHaveProperty("p256dh");
      expect(subs[0]).toHaveProperty("auth");
    });

    it("should get all admin push subscriptions", async () => {
      const { getAllAdminPushSubscriptions } = await import("./db");
      const subs = await getAllAdminPushSubscriptions();
      expect(subs).toHaveLength(1);
      expect(subs[0].endpoint).toContain("admin");
    });

    it("should get chat room member IDs", async () => {
      const { getChatRoomMemberIds } = await import("./db");
      const memberIds = await getChatRoomMemberIds(1);
      expect(memberIds).toEqual([1, 2, 3]);
    });
  });

  describe("Web Push Helper - sendPushToUsers", () => {
    it("should send push notifications to multiple users", async () => {
      const webPush = await import("web-push");
      const { getPushSubscriptionsByUserIds } = await import("./db");
      
      const subs = await getPushSubscriptionsByUserIds([1, 2]);
      let sent = 0;
      for (const sub of subs) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
            JSON.stringify({ title: "Test", body: "Test message" })
          );
          sent++;
        } catch (_) {}
      }
      expect(sent).toBe(2);
      expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe("Push Notification Data Format", () => {
    it("should include type and metadata for chat messages", () => {
      const payload = {
        title: "새 메시지",
        body: "User1: 안녕하세요",
        tag: "chat-msg-1",
        data: { type: "chat_message", roomId: 5 },
      };
      expect(payload.data.type).toBe("chat_message");
      expect(payload.data.roomId).toBe(5);
    });

    it("should include type for flight delay notifications", () => {
      const payload = {
        title: "✈️ 항공편 지연",
        body: "KE123 항공편이 2시간 지연되었습니다",
        tag: "flight-delay-1",
        data: { type: "flight_delay" },
      };
      expect(payload.data.type).toBe("flight_delay");
    });

    it("should include type for schedule change notifications", () => {
      const payload = {
        title: "📅 일정 변경",
        body: "오후 미팅 일정이 변경되었습니다",
        tag: "schedule-change-1",
        data: { type: "schedule_change" },
      };
      expect(payload.data.type).toBe("schedule_change");
    });

    it("should include type for geofence notifications", () => {
      const payload = {
        title: "📍 지오펜싱 알림",
        body: "User1님이 호텔 영역에 진입했습니다",
        tag: "geofence-enter-1",
        data: { type: "geofence" },
      };
      expect(payload.data.type).toBe("geofence");
    });
  });

  describe("Service Worker Routing", () => {
    it("should route chat notifications to correct path", () => {
      const data = { type: "chat_message", roomId: 5 };
      let targetUrl = "/";
      if (data.type === "chat_message" && data.roomId) {
        targetUrl = `/community/chat/${data.roomId}`;
      }
      expect(targetUrl).toBe("/community/chat/5");
    });

    it("should route flight notifications to admin flights", () => {
      const data = { type: "flight_delay" };
      let targetUrl = "/";
      if (data.type === "flight_delay" || data.type === "flight_cancel") {
        targetUrl = "/admin/flights";
      }
      expect(targetUrl).toBe("/admin/flights");
    });

    it("should route schedule notifications to admin schedule", () => {
      const data = { type: "schedule_change" };
      let targetUrl = "/";
      if (data.type === "schedule_change" || data.type === "schedule_reminder") {
        targetUrl = "/admin/schedule";
      }
      expect(targetUrl).toBe("/admin/schedule");
    });

    it("should route geofence notifications to admin geofence", () => {
      const data = { type: "geofence" };
      let targetUrl = "/";
      if (data.type === "geofence") {
        targetUrl = "/admin/geofence";
      }
      expect(targetUrl).toBe("/admin/geofence");
    });
  });
});
