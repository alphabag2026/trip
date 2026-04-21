import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Web Push Notification System", () => {
  // ── Service Worker Tests ──
  describe("Service Worker (sw.js)", () => {
    const swContent = readFileSync(resolve(__dirname, "../client/public/sw.js"), "utf-8");

    it("should handle push events", () => {
      expect(swContent).toContain("self.addEventListener('push'");
      expect(swContent).toContain("showNotification");
    });

    it("should handle notification click with proper routing", () => {
      expect(swContent).toContain("self.addEventListener('notificationclick'");
      expect(swContent).toContain("event.notification.close()");
    });

    it("should route chat_message notifications to community chat", () => {
      expect(swContent).toContain("notifData.type === 'chat_message'");
      expect(swContent).toContain("/community/chat/");
    });

    it("should route flight_delay notifications to admin flights", () => {
      expect(swContent).toContain("notifData.type === 'flight_delay'");
      expect(swContent).toContain("/admin/flights");
    });

    it("should route schedule_change notifications to admin schedule", () => {
      expect(swContent).toContain("notifData.type === 'schedule_change'");
      expect(swContent).toContain("/admin/schedule");
    });

    it("should route geofence notifications to admin geofence", () => {
      expect(swContent).toContain("notifData.type === 'geofence'");
      expect(swContent).toContain("/admin/geofence");
    });

    it("should route registration_status notifications to my-page", () => {
      expect(swContent).toContain("notifData.type === 'registration_status'");
      expect(swContent).toContain("targetUrl = '/my-page'");
    });

    it("should route pickup_time notifications to my-page", () => {
      expect(swContent).toContain("notifData.type === 'pickup_time'");
    });

    it("should handle install and activate events", () => {
      expect(swContent).toContain("self.addEventListener('install'");
      expect(swContent).toContain("self.addEventListener('activate'");
      expect(swContent).toContain("self.skipWaiting()");
      expect(swContent).toContain("self.clients.claim()");
    });

    it("should set vibration pattern", () => {
      expect(swContent).toContain("vibrate:");
    });

    it("should support renotify for tag-based notifications", () => {
      expect(swContent).toContain("renotify: true");
    });
  });

  // ── WebPush Helper Tests ──
  describe("WebPush Helper", () => {
    const helperContent = readFileSync(resolve(__dirname, "./webPushHelper.ts"), "utf-8");

    it("should export sendWebPush function", () => {
      expect(helperContent).toContain("export async function sendWebPush");
    });

    it("should export sendPushToAdmins function", () => {
      expect(helperContent).toContain("export async function sendPushToAdmins");
    });

    it("should export sendPushToUsers function", () => {
      expect(helperContent).toContain("export async function sendPushToUsers");
    });

    it("should export sendPushToMeetupParticipants function", () => {
      expect(helperContent).toContain("export async function sendPushToMeetupParticipants");
    });

    it("should export sendPushToChatRoomMembers function", () => {
      expect(helperContent).toContain("export async function sendPushToChatRoomMembers");
    });

    it("should handle expired subscriptions (410/404)", () => {
      expect(helperContent).toContain("err.statusCode === 410");
      expect(helperContent).toContain("err.statusCode === 404");
      expect(helperContent).toContain("deletePushSubscription");
    });

    it("should initialize VAPID details", () => {
      expect(helperContent).toContain("setVapidDetails");
      expect(helperContent).toContain("VAPID_PUBLIC_KEY");
      expect(helperContent).toContain("VAPID_PRIVATE_KEY");
    });
  });

  // ── Router Push Integration Tests ──
  describe("Router Push Integration", () => {
    const routerContent = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");

    it("should import push helper functions", () => {
      expect(routerContent).toContain('import { sendPushToAdmins, sendPushToUsers, sendPushToMeetupParticipants, sendPushToChatRoomMembers }');
    });

    it("should send push on flight delay", () => {
      expect(routerContent).toContain("항공편 지연");
      expect(routerContent).toContain("sendPushToAdmins");
    });

    it("should send push on flight cancellation", () => {
      expect(routerContent).toContain("항공편 취소");
    });

    it("should send push on schedule change", () => {
      expect(routerContent).toContain("일정 변경");
      expect(routerContent).toContain("sendPushToMeetupParticipants");
    });

    it("should send push on chat message", () => {
      expect(routerContent).toContain("sendPushToChatRoomMembers");
    });

    it("should send push on registration approval", () => {
      expect(routerContent).toContain("참가 신청 ${statusText}");
      expect(routerContent).toContain('input.status === "approved"');
    });

    it("should send push on registration rejection", () => {
      expect(routerContent).toContain("참가 신청이 거절되었습니다");
    });

    it("should send push on geofence arrival", () => {
      expect(routerContent).toContain("도착");
      expect(routerContent).toContain("영역에 도착했습니다");
    });

    it("should send push on geofence departure", () => {
      expect(routerContent).toContain("이탈");
      expect(routerContent).toContain("영역에서 이탈했습니다");
    });

    it("should have push test endpoint", () => {
      expect(routerContent).toContain("푸시 알림 테스트");
      expect(routerContent).toContain("웹 푸시 알림이 정상적으로 동작합니다");
    });
  });

  // ── PushNotificationToggle Component Tests ──
  describe("PushNotificationToggle Component", () => {
    const componentContent = readFileSync(
      resolve(__dirname, "../client/src/components/PushNotificationToggle.tsx"),
      "utf-8"
    );

    it("should export PushNotificationToggle function", () => {
      expect(componentContent).toContain("export function PushNotificationToggle");
    });

    it("should register service worker", () => {
      expect(componentContent).toContain("serviceWorker");
    });

    it("should handle push subscription", () => {
      expect(componentContent).toContain("pushManager");
    });

    it("should use VAPID public key via tRPC query", () => {
      expect(componentContent).toContain("getVapidPublicKey");
      expect(componentContent).toContain("applicationServerKey");
    });
  });

  // ── MyPage Notification Tab Tests ──
  describe("MyPage Notification Tab", () => {
    const myPageContent = readFileSync(
      resolve(__dirname, "../client/src/pages/MyPage.tsx"),
      "utf-8"
    );

    it("should import PushNotificationToggle", () => {
      expect(myPageContent).toContain("PushNotificationToggle");
    });

    it("should have notifications tab trigger", () => {
      expect(myPageContent).toContain('value="notifications"');
    });

    it("should import Bell icon", () => {
      expect(myPageContent).toContain("Bell");
    });

    it("should show notification settings description", () => {
      expect(myPageContent).toContain("myPage.notificationSettings");
      expect(myPageContent).toContain("myPage.notificationDesc");
    });
  });
});
