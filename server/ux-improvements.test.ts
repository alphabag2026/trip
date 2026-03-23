import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-ux-test", email: "admin-ux@test.com", name: "Admin UX",
      loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2, openId: "user-ux-test", email: "user-ux@test.com", name: "User UX",
      loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
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

const adminCaller = appRouter.createCaller(createAdminContext());
const userCaller = appRouter.createCaller(createUserContext());
const publicCaller = appRouter.createCaller(createPublicContext());

describe("v4.3 - UX Improvements", () => {
  describe("AI Chatbot - Meetup dropdown optimization", () => {
    it("meetup.list should support status filter to reduce data", async () => {
      // Create a test meetup with open status
      const meetup = await adminCaller.meetup.create({
        title: "UX Test Meetup " + Date.now(),
        location: "Seoul",
        startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        endDate: new Date(Date.now() + 172800000).toISOString().split("T")[0],
        maxParticipants: 50,
        status: "open",
      });
      expect(meetup.id).toBeDefined();

      // List with status filter should work
      const openMeetups = await publicCaller.meetup.list({ status: "open" });
      expect(Array.isArray(openMeetups)).toBe(true);
      // All returned meetups should have open status
      openMeetups.forEach((m: any) => {
        expect(m.status).toBe("open");
      });
    });

    it("meetup.list without filter should return all meetups", async () => {
      const allMeetups = await publicCaller.meetup.list({});
      expect(Array.isArray(allMeetups)).toBe(true);
    });
  });

  describe("Profile completion data availability", () => {
    it("userProfile.onboardingStatus should return completion data", async () => {
      const status = await userCaller.userProfile.onboardingStatus();
      expect(status).toBeDefined();
      expect(typeof status.onboardingCompleted).toBe("boolean");
    });

    it("userProfile.get should return profile data or null", async () => {
      const profile = await userCaller.userProfile.get();
      // Profile may be null for new users, that's expected behavior
      expect(profile === null || typeof profile === "object").toBe(true);
    });
  });

  describe("Registration auto-fill from profile", () => {
    it("userProfile.upsert should save phone and telegramId for auto-fill", async () => {
      await userCaller.userProfile.upsert({
        phone: "010-9876-5432",
        telegramId: "@uxtest",
        preferredLanguage: "ko",
      });

      const profile = await userCaller.userProfile.get();
      expect(profile).toBeDefined();
      expect(profile?.phone).toBe("010-9876-5432");
      expect(profile?.telegramId).toBe("@uxtest");
    });
  });
});
