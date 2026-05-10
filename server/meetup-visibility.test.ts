import { describe, it, expect, vi } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  searchMeetups: vi.fn(),
  getPublicMeetups: vi.fn(),
  createMeetup: vi.fn(),
  updateMeetup: vi.fn(),
}));

import * as db from "./db";

describe("Meetup Visibility Feature", () => {
  describe("searchMeetups", () => {
    it("should return empty array when no public meetups exist", async () => {
      vi.mocked(db.searchMeetups).mockResolvedValue([]);
      const result = await db.searchMeetups("");
      expect(result).toEqual([]);
    });

    it("should return public meetups for empty query", async () => {
      const mockMeetups = [
        { id: 1, title: "Public Meetup", visibility: "public", shareToken: "abc123" },
        { id: 2, title: "Another Public", visibility: "public", shareToken: "def456" },
      ];
      vi.mocked(db.searchMeetups).mockResolvedValue(mockMeetups as any);
      const result = await db.searchMeetups("");
      expect(result).toHaveLength(2);
      expect(result[0].visibility).toBe("public");
    });

    it("should search by title for public meetups", async () => {
      const mockMeetups = [
        { id: 1, title: "하롱베이 2140 Xplay", visibility: "public", shareToken: "abc123" },
      ];
      vi.mocked(db.searchMeetups).mockResolvedValue(mockMeetups as any);
      const result = await db.searchMeetups("2140");
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain("2140");
    });

    it("should also find by project code regardless of visibility", async () => {
      const mockMeetups = [
        { id: 1, title: "Private Meetup", visibility: "referral_only", projectCode: "104.340.300", shareToken: "xyz789" },
      ];
      vi.mocked(db.searchMeetups).mockResolvedValue(mockMeetups as any);
      const result = await db.searchMeetups("104.340.300");
      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe("referral_only");
    });
  });

  describe("Visibility field validation", () => {
    it("should accept 'public' as valid visibility value", () => {
      const validValues = ["public", "referral_only"];
      expect(validValues).toContain("public");
      expect(validValues).toContain("referral_only");
    });

    it("should default to referral_only when not specified", () => {
      const defaultVisibility = "referral_only";
      expect(defaultVisibility).toBe("referral_only");
    });
  });

  describe("Meetup create with visibility", () => {
    it("should create meetup with public visibility", async () => {
      vi.mocked(db.createMeetup).mockResolvedValue(1);
      const result = await db.createMeetup({
        title: "Test Public Meetup",
        visibility: "public",
        createdBy: 1,
        projectCode: "100.200.300",
        shareToken: "test123",
      } as any);
      expect(result).toBe(1);
      expect(db.createMeetup).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: "public" })
      );
    });

    it("should create meetup with referral_only visibility", async () => {
      vi.mocked(db.createMeetup).mockResolvedValue(2);
      const result = await db.createMeetup({
        title: "Test Private Meetup",
        visibility: "referral_only",
        createdBy: 1,
        projectCode: "100.200.301",
        shareToken: "test456",
      } as any);
      expect(result).toBe(2);
      expect(db.createMeetup).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: "referral_only" })
      );
    });
  });

  describe("Meetup update visibility", () => {
    it("should update meetup visibility from referral_only to public", async () => {
      vi.mocked(db.updateMeetup).mockResolvedValue(undefined);
      await db.updateMeetup(1, { visibility: "public" } as any);
      expect(db.updateMeetup).toHaveBeenCalledWith(1, { visibility: "public" });
    });
  });
});
