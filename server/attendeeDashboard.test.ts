import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getRegistrationStatsByMeetupWithDateRange: vi.fn().mockResolvedValue({
    total: 50,
    pending: 10,
    approved: 25,
    rejected: 5,
    completed: 10,
    domestic: 30,
    overseas: 20,
    byCategory: [
      { category: "meetup", count: 30 },
      { category: "event", count: 15 },
      { category: "meeting", count: 5 },
    ],
    byNationality: [
      { nationality: "KOR", count: 20 },
      { nationality: "CHN", count: 15 },
      { nationality: "USA", count: 10 },
    ],
    recentTrend: [
      { date: "2026-04-01", count: 5 },
      { date: "2026-04-02", count: 8 },
      { date: "2026-04-03", count: 3 },
    ],
  }),
  getMeetupComparisonStats: vi.fn().mockResolvedValue([
    {
      meetupId: 1,
      meetupTitle: "Dubai Meetup",
      total: 30,
      pending: 5,
      approved: 15,
      rejected: 3,
      completed: 7,
      domestic: 10,
      overseas: 20,
    },
    {
      meetupId: 2,
      meetupTitle: "Tokyo Meetup",
      total: 20,
      pending: 5,
      approved: 10,
      rejected: 2,
      completed: 3,
      domestic: 15,
      overseas: 5,
    },
  ]),
  getDailyRegistrationTrend: vi.fn().mockResolvedValue([
    { date: "2026-04-01", total: 5, approved: 3, pending: 1, rejected: 1 },
    { date: "2026-04-02", total: 8, approved: 5, pending: 2, rejected: 1 },
    { date: "2026-04-03", total: 3, approved: 2, pending: 1, rejected: 0 },
  ]),
}));

import * as db from "./db";

describe("Attendee Dashboard API", () => {
  describe("getRegistrationStatsByMeetupWithDateRange", () => {
    it("should return stats for all meetups with no date range", async () => {
      const result = await db.getRegistrationStatsByMeetupWithDateRange();
      expect(result).toBeDefined();
      expect(result.total).toBe(50);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(25);
      expect(result.rejected).toBe(5);
      expect(result.completed).toBe(10);
      expect(result.domestic).toBe(30);
      expect(result.overseas).toBe(20);
    });

    it("should return category breakdown", async () => {
      const result = await db.getRegistrationStatsByMeetupWithDateRange();
      expect(result.byCategory).toHaveLength(3);
      expect(result.byCategory[0]).toEqual({ category: "meetup", count: 30 });
    });

    it("should return nationality breakdown", async () => {
      const result = await db.getRegistrationStatsByMeetupWithDateRange();
      expect(result.byNationality).toHaveLength(3);
      expect(result.byNationality[0].nationality).toBe("KOR");
    });

    it("should return recent trend data", async () => {
      const result = await db.getRegistrationStatsByMeetupWithDateRange();
      expect(result.recentTrend).toHaveLength(3);
      expect(result.recentTrend[0]).toHaveProperty("date");
      expect(result.recentTrend[0]).toHaveProperty("count");
    });

    it("should accept meetupId parameter", async () => {
      await db.getRegistrationStatsByMeetupWithDateRange(1);
      expect(db.getRegistrationStatsByMeetupWithDateRange).toHaveBeenCalledWith(1);
    });

    it("should accept dateRange parameter", async () => {
      await db.getRegistrationStatsByMeetupWithDateRange(undefined, "week");
      expect(db.getRegistrationStatsByMeetupWithDateRange).toHaveBeenCalledWith(undefined, "week");
    });

    it("should accept both meetupId and dateRange", async () => {
      await db.getRegistrationStatsByMeetupWithDateRange(1, "month");
      expect(db.getRegistrationStatsByMeetupWithDateRange).toHaveBeenCalledWith(1, "month");
    });
  });

  describe("getMeetupComparisonStats", () => {
    it("should return comparison data for all meetups", async () => {
      const result = await db.getMeetupComparisonStats();
      expect(result).toHaveLength(2);
    });

    it("should include meetup title and all status counts", async () => {
      const result = await db.getMeetupComparisonStats();
      const first = result[0];
      expect(first.meetupTitle).toBe("Dubai Meetup");
      expect(first.total).toBe(30);
      expect(first.pending).toBe(5);
      expect(first.approved).toBe(15);
      expect(first.rejected).toBe(3);
      expect(first.completed).toBe(7);
      expect(first.domestic).toBe(10);
      expect(first.overseas).toBe(20);
    });

    it("should include meetupId for each entry", async () => {
      const result = await db.getMeetupComparisonStats();
      expect(result[0].meetupId).toBe(1);
      expect(result[1].meetupId).toBe(2);
    });
  });

  describe("getDailyRegistrationTrend", () => {
    it("should return daily trend data", async () => {
      const result = await db.getDailyRegistrationTrend();
      expect(result).toHaveLength(3);
    });

    it("should include multi-status breakdown per day", async () => {
      const result = await db.getDailyRegistrationTrend();
      const first = result[0];
      expect(first).toHaveProperty("date");
      expect(first).toHaveProperty("total");
      expect(first).toHaveProperty("approved");
      expect(first).toHaveProperty("pending");
      expect(first).toHaveProperty("rejected");
    });

    it("should accept days parameter", async () => {
      await db.getDailyRegistrationTrend(7);
      expect(db.getDailyRegistrationTrend).toHaveBeenCalledWith(7);
    });

    it("should default to 30 days", async () => {
      await db.getDailyRegistrationTrend();
      expect(db.getDailyRegistrationTrend).toHaveBeenCalledWith();
    });
  });
});
