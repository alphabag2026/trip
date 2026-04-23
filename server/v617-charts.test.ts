import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

function createAdminContext() {
  return {
    user: { id: 1, name: "Admin", email: "admin@test.com", role: "admin", openId: "test-open-id" },
    req: {} as any,
    res: {} as any,
  };
}

const adminCaller = appRouter.createCaller(createAdminContext() as any);

describe("v6.17 - BookingPipeline recharts compatibility", () => {
  it("should return exactly 5 funnel stages with numeric counts", async () => {
    const result = await adminCaller.bookingPipeline.stats({ meetupId: 360005 });
    expect(result.stages).toBeDefined();
    expect(result.stages.length).toBe(5);
    for (const stage of result.stages) {
      expect(stage).toHaveProperty("name");
      expect(stage).toHaveProperty("label");
      expect(stage).toHaveProperty("count");
      expect(typeof stage.count).toBe("number");
      expect(stage.count).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return all 4 conversion rate keys as numbers", async () => {
    const result = await adminCaller.bookingPipeline.stats({ meetupId: 360005 });
    const rates = result.conversionRates;
    expect(rates).toBeDefined();
    expect(typeof rates.inviteToRsvp).toBe("number");
    expect(typeof rates.rsvpToApproved).toBe("number");
    expect(typeof rates.approvedToCheckin).toBe("number");
    expect(typeof rates.checkinToCompleted).toBe("number");
    // Rates should be 0-100
    for (const key of Object.keys(rates)) {
      const val = (rates as any)[key];
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("should return bottleneck info or null", async () => {
    const result = await adminCaller.bookingPipeline.stats({ meetupId: 360005 });
    if (result.bottleneck) {
      expect(result.bottleneck).toHaveProperty("stage");
      expect(result.bottleneck).toHaveProperty("rate");
      expect(typeof result.bottleneck.rate).toBe("number");
    }
  });
});

describe("v6.17 - ExecutiveReport chart data structure", () => {
  it("should return attendance data suitable for PieChart", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    const { attendance } = result;
    expect(attendance).toBeDefined();
    expect(typeof attendance.total).toBe("number");
    expect(typeof attendance.approved).toBe("number");
    expect(typeof attendance.completed).toBe("number");
    expect(typeof attendance.attendanceRate).toBe("number");
    // Approved should not exceed total
    expect(attendance.approved).toBeLessThanOrEqual(attendance.total);
    // Completed should not exceed approved
    expect(attendance.completed).toBeLessThanOrEqual(attendance.approved);
  });

  it("should return budget data suitable for donut chart", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    if (result.budget) {
      expect(typeof result.budget.total).toBe("number");
      expect(typeof result.budget.spent).toBe("number");
      expect(typeof result.budget.remaining).toBe("number");
      expect(typeof result.budget.utilization).toBe("number");
      // Utilization should be 0-100 range
      expect(result.budget.utilization).toBeGreaterThanOrEqual(0);
      expect(result.budget.utilization).toBeLessThanOrEqual(100);
    }
  });

  it("should return expenses byCategory as object with numeric values for BarChart", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    expect(result.expenses).toBeDefined();
    expect(typeof result.expenses.total).toBe("number");
    expect(typeof result.expenses.byCategory).toBe("object");
    // Each category value should be a number
    for (const [key, val] of Object.entries(result.expenses.byCategory)) {
      expect(typeof key).toBe("string");
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return countryDistribution as array suitable for BarChart", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    expect(Array.isArray(result.countryDistribution)).toBe(true);
    for (const item of result.countryDistribution) {
      expect(item).toHaveProperty("country");
      expect(item).toHaveProperty("count");
      expect(typeof item.country).toBe("string");
      expect(typeof item.count).toBe("number");
    }
  });

  it("should return ROI data when budget exists", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    if (result.roi) {
      expect(typeof result.roi.costPerAttendee).toBe("number");
      expect(typeof result.roi.totalInvestment).toBe("number");
      expect(result.roi.costPerAttendee).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return meetup info in report", async () => {
    const result = await adminCaller.executiveReport.getData({ meetupId: 360005 });
    expect(result.meetup).toBeDefined();
  });
});
