import { describe, it, expect, vi } from "vitest";

// Test attendeeDashboard stats structure
describe("v12.2 - Attendee Dashboard & Invitation", () => {
  describe("getRegistrationStatsByMeetup", () => {
    it("should return correct stat structure with all required fields", async () => {
      const { getRegistrationStatsByMeetup } = await import("./db");
      const stats = await getRegistrationStatsByMeetup();
      
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("approved");
      expect(stats).toHaveProperty("rejected");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("domestic");
      expect(stats).toHaveProperty("overseas");
      expect(stats).toHaveProperty("byCategory");
      expect(stats).toHaveProperty("byNationality");
      expect(stats).toHaveProperty("recentTrend");
      
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.approved).toBe("number");
      expect(typeof stats.rejected).toBe("number");
      expect(typeof stats.completed).toBe("number");
      expect(typeof stats.domestic).toBe("number");
      expect(typeof stats.overseas).toBe("number");
      expect(Array.isArray(stats.byCategory)).toBe(true);
      expect(Array.isArray(stats.byNationality)).toBe(true);
      expect(Array.isArray(stats.recentTrend)).toBe(true);
    });

    it("should filter by meetupId when provided", async () => {
      const { getRegistrationStatsByMeetup } = await import("./db");
      // Using a non-existent meetup ID should return zeros
      const stats = await getRegistrationStatsByMeetup(999999);
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
    });
  });

  describe("bulkUpdateRegistrationStatus", () => {
    it("should be a function that accepts ids and status", async () => {
      const { bulkUpdateRegistrationStatus } = await import("./db");
      expect(typeof bulkUpdateRegistrationStatus).toBe("function");
    });
  });

  describe("generateInvitationImage", () => {
    it("should generate a PNG buffer from meetup data", async () => {
      const { generateInvitationImage } = await import("./invitation");
      
      const buffer = await generateInvitationImage({
        meetupTitle: "테스트 밋업 - Alpha Trip Bangkok",
        meetupType: "meetup",
        location: "방콕, 태국",
        country: "TH",
        dateRange: "2026-04-15 ~ 2026-04-20",
        maxParticipants: 50,
        description: "Alpha Trip 방콕 밋업에 참가하세요! 네트워킹과 관광을 동시에 즐길 수 있는 기회입니다.",
        qrUrl: "https://example.com/register/1",
        lang: "ko",
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000); // Should be a meaningful image
      // PNG magic bytes
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4E); // N
      expect(buffer[3]).toBe(0x47); // G
    }, 30000);

    it("should generate invitation in English", async () => {
      const { generateInvitationImage } = await import("./invitation");
      
      const buffer = await generateInvitationImage({
        meetupTitle: "Alpha Trip Bangkok Meetup",
        meetupType: "meetup",
        location: "Bangkok, Thailand",
        country: "TH",
        dateRange: "2026-04-15 ~ 2026-04-20",
        qrUrl: "https://example.com/register/1",
        lang: "en",
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    }, 30000);

    it("should generate invitation in Chinese", async () => {
      const { generateInvitationImage } = await import("./invitation");
      
      const buffer = await generateInvitationImage({
        meetupTitle: "Alpha Trip 曼谷聚会",
        meetupType: "meetup",
        location: "曼谷, 泰国",
        country: "TH",
        dateRange: "2026-04-15 ~ 2026-04-20",
        qrUrl: "https://example.com/register/1",
        lang: "zh",
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    }, 30000);

    it("should handle missing optional fields gracefully", async () => {
      const { generateInvitationImage } = await import("./invitation");
      
      const buffer = await generateInvitationImage({
        meetupTitle: "Simple Meetup",
        meetupType: "event",
        location: "",
        country: "",
        dateRange: "미정",
        qrUrl: "https://example.com/register/2",
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    }, 30000);
  });

  describe("i18n keys", () => {
    it("should have attendeeDashboard keys in ko.json", async () => {
      const ko = await import("../client/src/locales/ko.json");
      expect(ko.default.admin.attendeeDashboard).toBeDefined();
      expect(ko.default.admin.attendeeDashboard.title).toBe("참가자 대시보드");
      expect(ko.default.admin.attendeeDashboard.totalApplications).toBe("총 신청");
      expect(ko.default.admin.attendeeDashboard.bulkApprove).toBe("일괄 승인");
    });

    it("should have attendeeDashboard keys in en.json", async () => {
      const en = await import("../client/src/locales/en.json");
      expect(en.default.admin.attendeeDashboard).toBeDefined();
      expect(en.default.admin.attendeeDashboard.title).toBe("Attendee Dashboard");
    });

    it("should have attendeeDashboard keys in zh.json", async () => {
      const zh = await import("../client/src/locales/zh.json");
      expect(zh.default.admin.attendeeDashboard).toBeDefined();
      expect(zh.default.admin.attendeeDashboard.title).toBe("参与者仪表板");
    });

    it("should have invitation keys in all languages", async () => {
      const ko = await import("../client/src/locales/ko.json");
      const en = await import("../client/src/locales/en.json");
      const zh = await import("../client/src/locales/zh.json");
      
      expect(ko.default.admin.invitation.title).toBe("밋업 초대장 생성");
      expect(en.default.admin.invitation.title).toBe("Meetup Invitation Generator");
      expect(zh.default.admin.invitation.title).toBe("聚会邀请函生成");
    });
  });
});
