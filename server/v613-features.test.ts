import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// Helper to create admin context
function createAdminContext() {
  return {
    user: { id: 1, name: "Admin", email: "admin@test.com", role: "admin", openId: "test-open-id" },
    req: {} as any,
    res: {} as any,
  };
}

function createPublicContext() {
  return {
    user: null,
    req: {} as any,
    res: {} as any,
  };
}

const adminCaller = appRouter.createCaller(createAdminContext() as any);

describe("v6.13 - Booking Pipeline", () => {
  it("should return pipeline stages for a meetup", async () => {
    const result = await adminCaller.bookingPipeline.stats({ meetupId: 360005 });
    expect(result).toBeDefined();
    expect(result.stages).toBeDefined();
    expect(Array.isArray(result.stages)).toBe(true);
    expect(result.stages.length).toBeGreaterThanOrEqual(3);
    // Each stage should have label, count, color
    for (const stage of result.stages) {
      expect(stage).toHaveProperty("label");
      expect(stage).toHaveProperty("count");
      expect(typeof stage.count).toBe("number");
    }
  });

  it("should include conversion rates", async () => {
    const result = await adminCaller.bookingPipeline.stats({ meetupId: 360005 });
    expect(result.conversionRates).toBeDefined();
    expect(typeof result.conversionRates).toBe("object");
    expect(result.conversionRates).toHaveProperty("inviteToRsvp");
  });
});

describe("v6.13 - SOS", () => {
  it("should send SOS alert", async () => {
    const result = await adminCaller.sos.send({
      message: "Test SOS - unit test",
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

describe("v6.13 - Emergency Contact", () => {
  it("should upsert and list emergency contacts", async () => {
    // Upsert
    const upsertResult = await adminCaller.emergencyContact.upsert({
      contactName: "Test Contact",
      phone: "+82-10-9999-8888",
      relationship: "테스트",
    });
    expect(upsertResult).toBeDefined();
    expect(upsertResult.id).toBeDefined();

    // List
    const contacts = await adminCaller.emergencyContact.list({});
    expect(Array.isArray(contacts)).toBe(true);
  });
});

describe("v6.13 - Executive Report", () => {
  it("should return report data for a meetup", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    expect(result).toBeDefined();
    expect(result.attendance).toBeDefined();
    expect(result.attendance).toHaveProperty("total");
    expect(result.attendance).toHaveProperty("approved");
    expect(result.attendance).toHaveProperty("completed");
    expect(result.attendance).toHaveProperty("attendanceRate");
    expect(result.expenses).toBeDefined();
    expect(result.expenses).toHaveProperty("total");
    expect(result.expenses).toHaveProperty("byCategory");
    expect(result.countryDistribution).toBeDefined();
    expect(Array.isArray(result.countryDistribution)).toBe(true);
  });
});
