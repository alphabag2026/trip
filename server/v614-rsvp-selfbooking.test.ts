import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// ── Helpers ──────────────────────────────────────────────
function createAdminContext() {
  return {
    user: { id: 1, openId: "admin-test", name: "Admin", role: "admin" as const },
  };
}

describe("v6.14 - RSVP Reminder & Self Booking", () => {
  // ── RSVP Reminder ──
  describe("rsvpReminder", () => {
    it("should get RSVP stats for a meetup", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.rsvpReminder.getStats({ meetupId: 360005 });
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("accepted");
      expect(result).toHaveProperty("rejected");
      expect(result).toHaveProperty("responseRate");
      expect(typeof result.total).toBe("number");
    });

    it("should list pending RSVP invitations", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.rsvpReminder.getPending({ meetupId: 360005 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ── Self Booking ──
  describe("selfBooking", () => {
    it("should list self booking requests for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.selfBooking.listByMeetup({ meetupId: 360005 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should list user's own self booking requests", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.selfBooking.myRequests();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
