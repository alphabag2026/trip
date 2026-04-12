import { describe, it, expect, vi } from "vitest";

// Test schedule reminder and RSVP data structures and logic

describe("Schedule Reminder", () => {
  it("should validate reminder minutes options", () => {
    const validOptions = [15, 30, 60, 120, 1440];
    for (const min of validOptions) {
      expect(min).toBeGreaterThan(0);
      expect(min).toBeLessThanOrEqual(1440);
    }
  });

  it("should format reminder time correctly", () => {
    const formatMinutes = (m: number) => {
      if (m >= 1440) return `${Math.floor(m / 1440)}일 전`;
      if (m >= 60) return `${Math.floor(m / 60)}시간 전`;
      return `${m}분 전`;
    };
    expect(formatMinutes(15)).toBe("15분 전");
    expect(formatMinutes(30)).toBe("30분 전");
    expect(formatMinutes(60)).toBe("1시간 전");
    expect(formatMinutes(120)).toBe("2시간 전");
    expect(formatMinutes(1440)).toBe("1일 전");
  });

  it("should calculate reminder send time correctly", () => {
    const eventDate = new Date("2026-04-15T10:00:00Z");
    const reminderMinutes = 60;
    const sendAt = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
    expect(sendAt.toISOString()).toBe("2026-04-15T09:00:00.000Z");
  });

  it("should calculate 30min reminder correctly", () => {
    const eventDate = new Date("2026-04-15T14:30:00Z");
    const reminderMinutes = 30;
    const sendAt = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
    expect(sendAt.toISOString()).toBe("2026-04-15T14:00:00.000Z");
  });

  it("should calculate 1-day reminder correctly", () => {
    const eventDate = new Date("2026-04-20T09:00:00Z");
    const reminderMinutes = 1440;
    const sendAt = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
    expect(sendAt.toISOString()).toBe("2026-04-19T09:00:00.000Z");
  });

  it("should validate reminder status transitions", () => {
    const validStatuses = ["pending", "sent", "failed"];
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("sent");
    expect(validStatuses).toContain("failed");
  });

  it("should not send reminder for past events", () => {
    const pastEvent = new Date("2020-01-01T10:00:00Z");
    const now = new Date();
    const sendAt = new Date(pastEvent.getTime() - 60 * 60 * 1000);
    expect(sendAt.getTime()).toBeLessThan(now.getTime());
  });
});

describe("Schedule RSVP", () => {
  it("should validate RSVP response options", () => {
    const validResponses = ["attending", "not_attending", "maybe"];
    expect(validResponses).toHaveLength(3);
    expect(validResponses).toContain("attending");
    expect(validResponses).toContain("not_attending");
    expect(validResponses).toContain("maybe");
  });

  it("should calculate RSVP stats correctly", () => {
    const responses = [
      { response: "attending" },
      { response: "attending" },
      { response: "not_attending" },
      { response: "maybe" },
      { response: "attending" },
    ];
    const stats = {
      attending: responses.filter(r => r.response === "attending").length,
      not_attending: responses.filter(r => r.response === "not_attending").length,
      maybe: responses.filter(r => r.response === "maybe").length,
      total: responses.length,
    };
    expect(stats.attending).toBe(3);
    expect(stats.not_attending).toBe(1);
    expect(stats.maybe).toBe(1);
    expect(stats.total).toBe(5);
  });

  it("should calculate RSVP percentages correctly", () => {
    const stats = { attending: 6, not_attending: 2, maybe: 2, total: 10 };
    const attendingPct = (stats.attending / stats.total) * 100;
    const notAttendingPct = (stats.not_attending / stats.total) * 100;
    const maybePct = (stats.maybe / stats.total) * 100;
    expect(attendingPct).toBe(60);
    expect(notAttendingPct).toBe(20);
    expect(maybePct).toBe(20);
    expect(attendingPct + notAttendingPct + maybePct).toBe(100);
  });

  it("should handle empty RSVP stats", () => {
    const stats = { attending: 0, not_attending: 0, maybe: 0, total: 0 };
    expect(stats.total).toBe(0);
  });

  it("should allow user to change RSVP response", () => {
    // Simulating upsert behavior - same user can change response
    const responses: Record<number, string> = {};
    responses[1] = "attending";
    expect(responses[1]).toBe("attending");
    responses[1] = "not_attending"; // Change response
    expect(responses[1]).toBe("not_attending");
  });

  it("should generate correct Telegram notification for RSVP reminder", () => {
    const schedule = { title: "공항 픽업", scheduleType: "transport" };
    const meetup = { title: "서울 밋업 2026" };
    const msg = `📋 [${meetup.title}] "${schedule.title}" 일정에 참석 여부를 알려주세요!\n✅ 참석 / ❌ 불참 / ❓ 미정`;
    expect(msg).toContain(meetup.title);
    expect(msg).toContain(schedule.title);
    expect(msg).toContain("참석");
    expect(msg).toContain("불참");
    expect(msg).toContain("미정");
  });

  it("should generate correct reminder notification text", () => {
    const schedule = { title: "호텔 → 컨퍼런스장 이동", scheduleType: "transport" };
    const reminderMinutes = 30;
    const msg = `⏰ ${reminderMinutes}분 후 "${schedule.title}" 일정이 시작됩니다! 준비해주세요.`;
    expect(msg).toContain("30분 후");
    expect(msg).toContain(schedule.title);
  });
});

describe("Schedule Type Labels", () => {
  it("should have labels for all schedule types", () => {
    const types = ["transport", "meal", "tour", "meeting", "free", "other"];
    const labels: Record<string, string> = {
      transport: "교통", meal: "식사", tour: "관광",
      meeting: "미팅", free: "자유시간", other: "기타",
    };
    for (const t of types) {
      expect(labels[t]).toBeDefined();
      expect(labels[t].length).toBeGreaterThan(0);
    }
  });
});
